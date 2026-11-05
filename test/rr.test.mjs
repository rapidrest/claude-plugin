import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  EXIT_TIMEOUT, EXIT_UNANSWERED, cleanChunk, encodeAnswer, lastSegment, parseArgs, resolveCli, run,
} from '../scripts/rr.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const FAKE_CLI = join(here, 'fixtures', 'fake-cli.mjs');
const env = { ...process.env, RAPIDREST_CLI: FAKE_CLI };

function capture() {
  const io = { out: '', err: '' };
  io.stdout = { write: (s) => { io.out += s; } };
  io.stderr = { write: (s) => { io.err += String(s); } };
  return io;
}

function result(io) {
  const line = io.out.split('\n').find((l) => l.startsWith('RESULT '));
  assert.ok(line, `no RESULT line in output:\n${io.out}\n${io.err}`);
  return JSON.parse(line.slice('RESULT '.length));
}

async function runFake(cliArgs, answers = [], extra = {}) {
  const io = capture();
  const code = await run({ answers, cwd: here, timeout: 30, cliArgs, ...extra }, io, env);
  return { code, io };
}

describe('parseArgs', () => {
  it('splits wrapper options from CLI args at --', () => {
    const opts = parseArgs(['--answer', 'n', '--answer=', '--timeout', '5', '--', 'generate', 'route', '--answer', 'x']);
    assert.deepEqual(opts.answers, ['n', '']);
    assert.equal(opts.timeout, 5);
    assert.deepEqual(opts.cliArgs, ['generate', 'route', '--answer', 'x']);
  });

  it('treats the first unknown argument as the start of the CLI args', () => {
    assert.deepEqual(parseArgs(['doctor', '--json']).cliArgs, ['doctor', '--json']);
  });

  it('rejects a missing value and a bad timeout', () => {
    assert.throws(() => parseArgs(['--answer']), /expects a value/);
    assert.throws(() => parseArgs(['--timeout', 'soon', '--', 'x']), /seconds/);
  });

  it('recognises --which and resolves --cwd', () => {
    const opts = parseArgs(['--which', '--cwd', '.']);
    assert.equal(opts.which, true);
    assert.equal(opts.cwd, process.cwd());
  });
});

describe('helpers', () => {
  it('encodes key tokens and always appends Enter', () => {
    assert.equal(encodeAnswer('{down}{down}'), '\x1b[B\x1b[B\n');
    assert.equal(encodeAnswer(''), '\n');
    assert.equal(encodeAnswer('{space}{up}x'), ' \x1b[Ax\n');
  });

  it('turns line redraws into \\r and drops other escapes', () => {
    assert.equal(cleanChunk('\x1b[32m? Q:\x1b[39m\x1b[42G'), '? Q:');
    assert.equal(lastSegment(cleanChunk('? Q: a\x1b[2K\x1b[G? Q: ab')), '? Q: ab');
    assert.equal(lastSegment('abc\r\r'), 'abc');
  });
});

describe('resolveCli', () => {
  it('uses RAPIDREST_CLI when it is a script path', () => {
    const cli = resolveCli(here, { RAPIDREST_CLI: FAKE_CLI });
    assert.equal(cli.command, process.execPath);
    assert.deepEqual(cli.args, [FAKE_CLI]);
  });

  it('uses RAPIDREST_CLI as a command otherwise', () => {
    assert.equal(resolveCli(here, { RAPIDREST_CLI: 'rr' }).command, 'rr');
  });

  it('prefers a project-local @rapidrest/cli install', () => {
    const project = mkdtempSync(join(tmpdir(), 'rr-local-'));
    const bin = join(project, 'node_modules', '@rapidrest', 'cli', 'bin');
    mkdirSync(bin, { recursive: true });
    writeFileSync(join(bin, 'run.js'), '');
    const cli = resolveCli(project, {});
    assert.deepEqual(cli.args, [join(bin, 'run.js')]);
    assert.match(cli.label, /project-local/);
  });
});

describe('run', () => {
  it('passes args through and returns 0 when nothing is asked', async () => {
    const { code, io } = await runFake(['none', 'a', 'b']);
    assert.equal(code, 0);
    assert.deepEqual(result(io).args, ['a', 'b']);
    assert.match(io.out, /no prompts here/);
  });

  it('answers text prompts in order, one prompt at a time', async () => {
    const { code, io } = await runFake(['inputs'], ['Collects metrics', '*/5 * * * *']);
    assert.equal(code, 0);
    assert.deepEqual(result(io), { description: 'Collects metrics', schedule: '*/5 * * * *' });
    assert.match(io.err, /answering "Enter a short description:/);
  });

  it('accepts a default with an empty answer', async () => {
    const { io } = await runFake(['inputs'], ['x', '']);
    assert.equal(result(io).schedule, '* * * * *');
  });

  it('answers confirm prompts', async () => {
    const { code, io } = await runFake(['confirm'], ['n', 'y']);
    assert.equal(code, 0);
    assert.deepEqual(result(io), { api: false, protect: true });
  });

  it('drives select prompts with key tokens', async () => {
    const { io } = await runFake(['select'], ['{down}{down}']);
    assert.equal(result(io).db, 'sqlite');
  });

  it('masks answers to secret prompts in its log', async () => {
    const { io } = await runFake(['secret'], ['hunter22']);
    assert.equal(result(io).length, 8);
    assert.ok(!io.err.includes('hunter22'));
    assert.match(io.err, /\*\*\*\*/);
  });

  it('stops with exit 3 and names the prompt when an answer is missing', async () => {
    const { code, io } = await runFake(['confirm'], ['n']);
    assert.equal(code, EXIT_UNANSWERED);
    assert.match(io.err, /UNANSWERED PROMPT: \? Enable protection\?/);
    assert.ok(!io.out.includes('RESULT'));
  });

  it('warns about unused answers', async () => {
    const { code, io } = await runFake(['none'], ['extra']);
    assert.equal(code, 0);
    assert.match(io.err, /1 unused --answer/);
  });

  it('propagates the CLI exit code and stderr', async () => {
    const { code, io } = await runFake(['exit', '7']);
    assert.equal(code, 7);
    assert.match(io.err, /failing on purpose/);
  });

  it('kills the CLI and exits 124 on timeout', async () => {
    const { code, io } = await runFake(['hang'], [], { timeout: 1 });
    assert.equal(code, EXIT_TIMEOUT);
    assert.match(io.err, /timed out/);
  });
});

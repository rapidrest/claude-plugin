#!/usr/bin/env node
///////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2026 Jean-Philippe Steinmetz
// SPDX-License-Identifier: MPL-2.0
///////////////////////////////////////////////////////////////////////////////
//
// rr.mjs — runs the RapidREST CLI safely from an agent (no TTY).
//
// Why this exists: the CLI uses @inquirer/prompts for anything not supplied by a flag. Without a
// TTY, a closed stdin makes the CLI exit 0 at the first prompt having done nothing, and piping all
// answers up front doesn't work either (the first prompt swallows the whole buffer). This wrapper
// keeps stdin open, waits for each prompt to actually render, and only then types the next
// `--answer`. If a prompt appears with no answer left, it kills the CLI and exits 3, naming the
// prompt, instead of hanging or silently "succeeding".
//
// Usage:
//   node rr.mjs [--answer <text>]... [--cwd <dir>] [--timeout <sec>] -- <rapidrest args...>
//   node rr.mjs --which            # print which CLI would be used, and its version
//
// Answers may contain key tokens for select/checkbox prompts: {down} {up} {space} {tab}.
// Every answer is followed by Enter. An empty answer ("") accepts the prompt's default.
//
// CLI resolution order: $RAPIDREST_CLI (a path to bin/run.js, or a command), the project's own
// node_modules/@rapidrest/cli, the global npm install, `rapidrest` on PATH (non-Windows), then
// `npx -y @rapidrest/cli@latest`.
//
// Exit codes: the CLI's own exit code, or 2 usage error, 3 unanswered prompt, 124 timeout,
// 130 interrupted.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXIT_USAGE = 2;
export const EXIT_UNANSWERED = 3;
export const EXIT_TIMEOUT = 124;
export const EXIT_INTERRUPTED = 130;

const IDLE_MS = Number(process.env.RR_IDLE_MS ?? 300);
const KEY_TOKENS = { '{down}': '\x1b[B', '{up}': '\x1b[A', '{space}': ' ', '{tab}': '\t' };
const SECRET_PATTERN = /secret|password|token|key/i;

/** Parses wrapper options up to `--`; everything after is passed to the CLI verbatim. */
export function parseArgs(argv) {
  const opts = { answers: [], cwd: process.cwd(), timeout: 0, which: false, cliArgs: [] };
  let i = 0;
  for (; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') { i++; break; }
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${arg} expects a value`);
      return argv[++i];
    };
    if (arg === '--answer' || arg === '-A') opts.answers.push(next());
    else if (arg.startsWith('--answer=')) opts.answers.push(arg.slice('--answer='.length));
    else if (arg === '--cwd') opts.cwd = resolve(next());
    else if (arg === '--timeout') opts.timeout = Number(next());
    else if (arg === '--which') opts.which = true;
    else { break; } // first non-wrapper argument: treat the rest as CLI args (`--` is optional)
  }
  opts.cliArgs = argv.slice(i);
  if (Number.isNaN(opts.timeout) || opts.timeout < 0) throw new Error('--timeout expects a number of seconds');
  return opts;
}

/** Converts an answer into the keystrokes to type, always ending with Enter. */
export function encodeAnswer(answer) {
  let out = answer;
  for (const [token, keys] of Object.entries(KEY_TOKENS)) out = out.split(token).join(keys);
  return out + '\n';
}

function findOnPath(name) {
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (dir && existsSync(join(dir, name))) return join(dir, name);
  }
  return undefined;
}

/** Works out how to launch the CLI. Returns { command, args, label }. */
export function resolveCli(cwd, env = process.env) {
  const node = process.execPath;
  const override = env.RAPIDREST_CLI;
  if (override) {
    if (/\.[cm]?js$/.test(override)) return { command: node, args: [resolve(override)], label: `RAPIDREST_CLI (${override})` };
    return { command: override, args: [], label: `RAPIDREST_CLI (${override})`, shell: process.platform === 'win32' };
  }

  const local = join(cwd, 'node_modules', '@rapidrest', 'cli', 'bin', 'run.js');
  if (existsSync(local)) return { command: node, args: [local], label: `project-local (${local})` };

  // A single command string (no args array) keeps Node's DEP0190 shell-args warning away on Windows.
  const npmRoot = spawnSync('npm root -g', { encoding: 'utf8', shell: true, windowsHide: true });
  const globalRun = npmRoot.status === 0 ? join(npmRoot.stdout.trim(), '@rapidrest', 'cli', 'bin', 'run.js') : '';
  if (globalRun && existsSync(globalRun)) return { command: node, args: [globalRun], label: `global (${globalRun})` };

  if (process.platform !== 'win32') {
    const onPath = findOnPath('rapidrest');
    if (onPath) return { command: onPath, args: [], label: `PATH (${onPath})` };
  }

  // npx fallback. On Windows run npm's own npx-cli.js with node to avoid `.cmd` shell quoting.
  const npxCli = join(dirname(node), 'node_modules', 'npm', 'bin', 'npx-cli.js');
  if (process.platform === 'win32' && existsSync(npxCli)) {
    return { command: node, args: [npxCli, '-y', '@rapidrest/cli@latest'], label: 'npx @rapidrest/cli@latest' };
  }
  return { command: 'npx', args: ['-y', '@rapidrest/cli@latest'], label: 'npx @rapidrest/cli@latest' };
}

// Strips colour/cursor escapes. Line-clearing sequences become \r so a redrawn prompt line
// replaces itself rather than concatenating every intermediate render.
export function cleanChunk(text) {
  return text
    .replace(/\x1b\[2K|\x1b\[1?G/g, '\r')   // clear line / cursor to column 1 → a redraw starts
    .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '')
    .replace(/\x1b\][^\x07]*\x07/g, '');
}

/** The text a terminal would show for a line that was redrawn in place (the last non-empty render). */
export function lastSegment(line) {
  return line.split('\r').filter((s) => s.trim() !== '').pop() ?? '';
}

function killTree(child) {
  if (child.exitCode !== null || child.pid === undefined) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
  } else {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
  }
}

/** Runs the CLI, answering prompts as they appear. Resolves to the exit code. */
export function run(opts, io = { stdout: process.stdout, stderr: process.stderr }, env = process.env) {
  const cli = resolveCli(opts.cwd, env);
  const log = (msg) => io.stderr.write(`[rr] ${msg}\n`);

  return new Promise((resolvePromise) => {
    const child = spawn(cli.command, [...cli.args, ...opts.cliArgs], {
      cwd: opts.cwd,
      env: { ...env, FORCE_COLOR: '0', NO_COLOR: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: cli.shell ?? false,
      detached: process.platform !== 'win32',
      windowsHide: true,
    });

    const answers = [...opts.answers];
    let partial = '';          // current, not-yet-terminated output line
    let activePrompt = null;   // text of a prompt that rendered and hasn't been answered/completed
    let idleTimer = null;
    let finished = false;
    let forcedCode = null;

    const finish = (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(idleTimer);
      clearTimeout(timeoutTimer);
      for (const sig of ['SIGINT', 'SIGTERM']) process.removeListener(sig, onSignal);
      if (forcedCode === null && answers.length > 0) {
        log(`warning: ${answers.length} unused --answer value(s); the CLI asked fewer questions than expected.`);
      }
      resolvePromise(forcedCode ?? code ?? 1);
    };

    const abort = (code) => { forcedCode = code; killTree(child); };

    const checkPrompt = () => {
      const line = lastSegment(partial).trim();
      if (line.startsWith('?')) activePrompt = line;
      if (activePrompt === null || finished) return;
      if (answers.length === 0) {
        log(`UNANSWERED PROMPT: ${activePrompt}`);
        log('The CLI asked a question that no flag or --answer covered. Re-run with the matching flag, or add --answer values in prompt order.');
        abort(EXIT_UNANSWERED);
        return;
      }
      const answer = answers.shift();
      const shown = SECRET_PATTERN.test(activePrompt) ? '****' : JSON.stringify(answer);
      log(`answering ${JSON.stringify(activePrompt.replace(/^\?\s*/, ''))} with ${shown}`);
      activePrompt = null;
      partial = '';
      child.stdin.write(encodeAnswer(answer));
    };

    const onOutput = (chunk) => {
      partial += cleanChunk(chunk.toString('utf8'));
      const lines = partial.split('\n');
      partial = lines.pop();
      for (const raw of lines) {
        const line = lastSegment(raw);
        const trimmed = line.trim();
        if (trimmed.startsWith('?')) { activePrompt = trimmed; continue; } // prompt renders are noise
        if (trimmed.startsWith('✔') || trimmed.startsWith('√')) activePrompt = null;
        io.stdout.write(line + '\n');
      }
      clearTimeout(idleTimer);
      idleTimer = setTimeout(checkPrompt, IDLE_MS);
    };

    child.stdout.on('data', onOutput);
    child.stderr.on('data', (chunk) => io.stderr.write(chunk));
    child.stdin.on('error', () => { /* child exited while we were typing */ });
    child.on('error', (err) => { log(`failed to launch ${cli.label}: ${err.message}`); forcedCode = 127; finish(127); });
    child.on('close', (code, signal) => {
      const rest = lastSegment(partial);
      if (rest.trim() && !rest.trim().startsWith('?')) io.stdout.write(rest + '\n');
      finish(code ?? (signal ? 1 : 0));
    });

    const timeoutTimer = opts.timeout > 0
      ? setTimeout(() => { log(`timed out after ${opts.timeout}s; stopping the CLI.`); abort(EXIT_TIMEOUT); }, opts.timeout * 1000)
      : null;
    const onSignal = () => abort(EXIT_INTERRUPTED);
    for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, onSignal);
  });
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`[rr] ${err.message}\n`);
    process.exit(EXIT_USAGE);
  }

  if (opts.which) {
    const cli = resolveCli(opts.cwd);
    process.stdout.write(`CLI: ${cli.label}\n`);
    opts.cliArgs = ['--version'];
    process.exit(await run(opts));
  }
  if (opts.cliArgs.length === 0) {
    process.stderr.write('[rr] usage: node rr.mjs [--answer <text>]... [--cwd <dir>] [--timeout <sec>] -- <rapidrest args...>\n');
    process.exit(EXIT_USAGE);
  }
  process.exit(await run(opts));
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const plugin = readJson('.claude-plugin/plugin.json');
const marketplace = readJson('.claude-plugin/marketplace.json');
const pkg = readJson('package.json');
const skillDirs = readdirSync(join(root, 'skills'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  assert.ok(match, 'missing frontmatter');
  return Object.fromEntries(match[1].split(/\r?\n/).map((line) => {
    const i = line.indexOf(':');
    return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
  }));
}

describe('plugin manifests', () => {
  it('keeps plugin.json and package.json versions in sync', () => {
    assert.equal(plugin.version, pkg.version);
  });

  it('lists this plugin in the marketplace under the same name', () => {
    const entry = marketplace.plugins.find((p) => p.name === plugin.name);
    assert.ok(entry);
    assert.equal(entry.source, './');
  });
});

describe('skills', () => {
  it('exist', () => assert.ok(skillDirs.length > 0));

  for (const dir of skillDirs) {
    describe(dir, () => {
      const text = readFileSync(join(root, 'skills', dir, 'SKILL.md'), 'utf8');
      const fm = frontmatter(text);

      it('has a name matching its directory and a description', () => {
        assert.equal(fm.name, dir);
        assert.ok(fm.description && fm.description.length > 40);
      });

      it('runs the CLI only through the wrapper', () => {
        assert.ok(text.includes('${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs'));
        assert.ok(text.includes('${CLAUDE_PLUGIN_ROOT}/references/cli.md'));
        // A bare `rapidrest <cmd>` / `npx @rapidrest/cli` invocation in a code block would bypass it.
        for (const block of text.match(/```[\s\S]*?```/g) ?? []) {
          assert.ok(!/^\s*(rapidrest|rr|npx)\s/m.test(block.replace(/^```\w*\n/, '')), `bare CLI call in:\n${block}`);
        }
      });

      it('only references plugin files that exist', () => {
        for (const [, rel] of text.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([\w./-]+)/g)) {
          assert.ok(existsSync(join(root, rel)), `${rel} does not exist`);
        }
      });
    });
  }

  it('never lets the model start a release on its own', () => {
    assert.match(readFileSync(join(root, 'skills', 'release', 'SKILL.md'), 'utf8'), /disable-model-invocation: true/);
  });
});

---
name: upgrade
description: Health-check and upgrade an existing RapidREST project with the RapidREST CLI — `doctor` finds and auto-fixes known problem patterns, `upgrade` re-syncs generator-owned boilerplate and @rapidrest/* dependency pins with the newest compatible templates. Use when the user wants to upgrade, update, modernize, migrate, or fix drift in a RapidREST project, or when a build/test fails in a way that suggests outdated scaffolding.
argument-hint: "[doctor | upgrade | full]"
allowed-tools: Bash(MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *), Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *)
---

# Check and upgrade a RapidREST project

Wraps `rapidrest doctor` and `rapidrest upgrade`. The user's request: $ARGUMENTS

Run the CLI only through the wrapper:
`MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" [--answer <text>]... -- <args>`.
If you haven't yet this session, read `${CLAUDE_PLUGIN_ROOT}/references/cli.md` first.

The two tools are complementary:
- **`doctor`** checks for a fixed list of known-bad patterns: wrong TypeORM type literals, a
  sqlite datastore missing `host`, a missing `vitest.config.ts`, unresolvable `typeorm`/`redis`
  types, the eslint-plugin-import vs eslint@10 conflict, the old boolean ACL shape, `JWTUser`
  with an extra `name`, and others. It can apply safe fixes automatically.
- **`upgrade`** re-syncs generator-owned files and dependency pins against the templates (see
  below). It only touches files that already exist, never `src/config.ts` or `test/config.ts`, and
  never removes dependencies.

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" --which` and report the CLI version. Which
templates get used depends on that version:
- **CLI 2.1.0 and earlier** bundle their templates, so an old install upgrades the project to old
  templates.
- **Newer CLIs** download the newest templates release compatible with the project. Only the
  templates major recorded in `package.json` (`rapidrest.templates`) is considered, and only when
  it matches the installed `@rapidrest/*` majors. `upgrade --json` reports the version as
  `templates.version` (plus `templates.from` when the recorded version changes), and `--write`
  records the new version.
- **Moving to a new templates major** (a new `@rapidrest/*` major) needs `--latest`:
  `-- upgrade --latest --json`, then `-- upgrade --latest --write`. Expect breaking changes. Only
  do this when the user asks for it, and only after explaining that it's a major move.

## Workflow (the full upgrade)

Run from the project root.

1. **Start from a clean tree.** Run `git status`. If there are uncommitted changes, tell the user
   and suggest they commit or stash first, so the upgrade diff can be reviewed in isolation.
   Don't commit for them.
2. **Diagnose:** `-- doctor --json`. Summarize the findings by severity, and note which ones say
   they can be auto-fixed.
3. **Plan the re-sync:** `-- upgrade --json` is a dry run. Summarize the files and dependency pins
   it would change.
4. **Apply**, after confirming with the user unless they already asked for the full upgrade:
   - `-- upgrade --write`
   - `-- doctor --fix`, which applies the mechanical fixes
   - `-- dep install` if `package.json` changed
5. **Hand-fix what remains.** Doctor findings without an automatic fix need judgment:
   - Old ACL shape (`create/read/update/delete: true` flags) → `actions: [ACLAction.CREATE, ...]`.
     `full: true` → `[ACLAction.FULL]`, and `special` is dropped with no replacement. Note that
     `ModelDecorators.Protect(classACL, recordACL?)` takes two arguments, while
     `RouteDecorators.Protect(acl)` takes one.
   - `JWTUser` objects with a `name` → move that label into `createToken`'s third `data`
     argument.
   - A stale dependency that the templates no longer use → remove it with `-- dep remove <pkg>`.
6. **Verify:** `-- doctor` should report no `error` findings. Then run `-- build` and `-- test`.
7. **Report:** what changed (point the user at `git diff`), what you fixed by hand, and anything
   left for them. Expected noise: copyright-year header lines show as changed once a year.

For "just check my project", stop after steps 2–3 and report.

## Dependencies beyond the template pins

`upgrade` only moves the pins the templates know about. To move *every* dependency to its latest
release, use `/rapidrest:deps` (`dep upgrade`). Do it as a separate step, after this workflow
passes, so failures can be traced to one cause.

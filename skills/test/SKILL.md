---
name: test
description: Run a RapidREST project's test suite (Vitest) through the RapidREST CLI — all tests, specific files, or with coverage — and diagnose failures. Use when the user wants to run, check, or fix tests or coverage in a RapidREST project.
argument-hint: "[test file or pattern] [--coverage]"
allowed-tools: Bash(MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *), Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *)
---

# Run RapidREST tests

Wraps `rapidrest test` (Vitest, using the project's own `vitest.config.ts`). The user's request:
$ARGUMENTS

Run the CLI only through the wrapper:
`MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" [--answer <text>]... -- <args>`.
If you haven't yet this session, read `${CLAUDE_PLUGIN_ROOT}/references/cli.md` first.

```sh
MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" --timeout 900 -- test                      # everything
MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" --timeout 900 -- test test/ProductRoute.test.ts
MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" --timeout 900 -- test --coverage
```

Run from the project root. Don't use `--watch`: it never exits.

## Reading failures

- Generated tests run SQL datastores against in-memory `better-sqlite3` (whatever
  `src/config.ts` targets) and mock Redis inline. A failure that only appears against real
  Postgres isn't something this suite would show.
- Decorator or metadata errors (`Reflect.getMetadata`, decorators not applied) usually mean
  `vitest.config.ts` is missing its SWC plugin. `/rapidrest:upgrade` (doctor) detects and fixes
  that.
- Fix failing application code, or tests made stale by the user's own changes. Don't weaken a
  generated assertion just to go green unless you understand why it no longer applies. Report
  any test you changed and why.

Report the pass/fail counts, and the coverage numbers when `--coverage` was used.

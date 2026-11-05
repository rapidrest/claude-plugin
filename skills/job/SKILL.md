---
name: job
description: Add a cron-scheduled background job to an existing RapidREST project with the RapidREST CLI, including its test file. Use when the user wants a scheduled task, cron job, periodic worker, or background process in a RapidREST project.
argument-hint: "<JobName> [schedule / what it does]"
allowed-tools: Bash(MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *), Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *)
---

# Add a RapidREST background job

Wraps `rapidrest generate job`. The user's request: $ARGUMENTS

Run the CLI only through the wrapper:
`MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" [--answer <text>]... -- <args>`.
If you haven't yet this session, read `${CLAUDE_PLUGIN_ROOT}/references/cli.md` first.

## Settle the answers

Every choice has a flag, so pass them all:

| Choice | Flag |
|---|---|
| Name | positional, PascalCase (`MetricsCollector`, `ExpireSessions`) |
| Description | `-d "<text>"` |
| Author | `-a "<author>"` (from `package.json` or git config) |
| Schedule | `-s "<cron>"`, a standard 5-field crontab expression |

Turn a plain-language schedule into cron yourself ("every 5 minutes" → `*/5 * * * *`, "nightly
at 2am" → `0 2 * * *`), and state the expression you chose in your reply. Ask only if the timing is
genuinely ambiguous.

## Generate

```sh
MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" -- generate job ExpireSessions \
  -a "Jane Doe <jane@example.com>" -d "Deletes expired sessions" -s "*/15 * * * *"
```

This writes `src/jobs/<Name>.ts` and `test/jobs/<Name>.test.ts`. (CLI 2.1.0 and earlier print the
project directory as the path; the files are in `src/jobs/`.) `--force` overwrites existing files, so use
it only with the user's agreement.

## Follow up

The generated class extends `BackgroundService` from `@rapidrest/service-core`. Put the
recurring work in `run()`, which is called on every tick of `schedule`. Put one-time setup and
teardown (connections, timers) in `start()`/`stop()`. Then extend the generated test to cover
that behaviour. On CLI 2.1.0 and earlier, also fix the test's config import if it reads `./config`
(it must be `../config`), and make sure no test body is left empty: both are template bugs there
that fail the build. Then build and test through the wrapper (`-- build`,
`-- test`).

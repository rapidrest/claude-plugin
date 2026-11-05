---
name: serve
description: Build, run, and stop a RapidREST project's server with the RapidREST CLI — development mode with hot reload and automatic in-memory databases, production start (Node or Bun), or a plain build. Use when the user wants to run, start, launch, serve, debug, or build a RapidREST server, or hit its endpoints locally.
argument-hint: "[dev | start | build] [--port N] [--bun] [--inspect]"
allowed-tools: Bash(MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *), Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *)
---

# Run a RapidREST server

Wraps `rapidrest dev`, `rapidrest start`, and `rapidrest build`. The user's request: $ARGUMENTS

Run the CLI only through the wrapper:
`MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" [--answer <text>]... -- <args>`.
If you haven't yet this session, read `${CLAUDE_PLUGIN_ROOT}/references/cli.md` first.

Run everything from the project root. None of these commands prompt.

## Which command

| Goal | Command |
|---|---|
| Local development, hot reload | `-- dev` |
| Production-style run (builds first) | `-- start` |
| Compile only | `-- build` (`--no-lint` to skip lint) |

Useful flags for `dev` and `start`:
- `-p <port>`: preferred port (default 3000). If it's taken, the next free port is used. **Read
  the actual port from the output**, don't assume it.
- `-d`/`--docker`: don't start in-memory databases, because they already run (e.g. via
  `docker compose up`). Without it, MongoDB/PostgreSQL/Redis start in memory automatically, so no
  local install is needed.
- `dev --inspect`: Node inspector on port 9229.
- `start --no-build`, `start --no-lint`, `start --bun` (runs under Bun 1.4+, downloading it if
  needed).

## Running a long-lived server

`dev` and `start` never exit on their own. Run them with the Bash tool's `run_in_background: true`:

```sh
MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" -- dev
```

Then:
1. Watch the background output until the server reports it's listening, and note the port. The
   first run can take a while: in-memory MongoDB may download a binary once.
2. Exercise it as the user asked, e.g. `curl -s http://localhost:<port>/status` (if the status
   route exists) or the routes you just built. With `@ApiRoute`, paths sit under `/api/v<n>`.
3. **Stop it with TaskStop when you're done**, unless the user wants it left running. Say which
   you did. The wrapper stops the CLI's whole process tree, including in-memory databases and
   watchers.

If startup fails, read the error: compile errors appear here first. Fix them in the project
code, or suggest `/rapidrest:upgrade` (doctor) when the failure points at outdated generated
boilerplate or dependency mismatches.

## Build only

```sh
MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" --timeout 900 -- build
```

This runs the project's own `build` script through its package manager, linting first, and
also builds the React client when `vite.config.ts` exists.

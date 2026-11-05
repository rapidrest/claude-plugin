---
name: deploy
description: Add or refresh deployment configuration for a RapidREST project with the RapidREST CLI — Dockerfile and Docker Compose with the project's databases, and a Kubernetes Helm chart. Use when the user wants to containerize, dockerize, add docker-compose, deploy to Kubernetes, or create/regenerate a Helm chart for a RapidREST project.
argument-hint: "[docker | k8s | both]"
allowed-tools: Bash(MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *), Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *)
---

# Docker and Kubernetes for RapidREST

Wraps `rapidrest generate docker` and `rapidrest generate k8s`. The user's request: $ARGUMENTS

Run the CLI only through the wrapper:
`MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" [--answer <text>]... -- <args>`.
If you haven't yet this session, read `${CLAUDE_PLUGIN_ROOT}/references/cli.md` first.

Both commands are fully flag-driven and build their output from the project's **current** state
(the datastores in `src/config.ts`, plus React if present). Run them from the project root.

## Docker: `generate docker`

Writes a `Dockerfile`, `docker-compose.yml`, debug/profile compose variants, and helper scripts,
with a service for each configured database.

```sh
MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" -- generate docker
```

React is auto-detected. Override that only if detection is wrong (`--has-react`/`--no-has-react`).

## Kubernetes: `generate k8s`

Writes a Helm chart under `helm/`, tailored to the configured datastores.

```sh
MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" -- generate k8s
```

## Regenerating after the project changes

When datastores have been added or removed since these files were generated, re-run with
`--force`. That **regenerates the files entirely and overwrites hand edits.** Before doing so:
1. Check `git status`/`git diff` for local edits to `Dockerfile`, `docker-compose*.yml`, or `helm/`.
2. If there are any, tell the user and either get their agreement or plan to re-apply the edits
   afterwards (read the old versions first so you can).

## Afterwards

- Docker: `docker compose up` runs the stack. For local development against those containers,
  `/rapidrest:serve` with `--docker` skips the in-memory databases.
- Helm: point out `helm/values.yaml` for image, tag, and resources. `rapidrest release` keeps
  `appVersion` and the image tag in sync on each release.
- Validate if the tools are available (`docker compose config`, `helm lint helm`). Report what
  you ran.

---
name: new-project
description: Scaffold a new RapidREST REST API server project (Node.js/TypeScript) with the official RapidREST CLI — databases (MongoDB, PostgreSQL, SQLite, Redis), default routes, React, Docker, Kubernetes/Helm, npm or yarn. Use when the user wants to create, bootstrap, or start a new RapidREST project or service.
argument-hint: "[project-name] [what the service is for]"
allowed-tools: Bash(MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *), Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *)
---

# Scaffold a new RapidREST project

Wraps `rapidrest generate server`. The user's request: $ARGUMENTS

Run the CLI only through the wrapper:
`MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" [--answer <text>]... -- <args>`.
If you haven't yet this session, read `${CLAUDE_PLUGIN_ROOT}/references/cli.md` first. It explains
why the wrapper is required and what exit code 3 means.

## 1. Settle the answers

`generate server` is fully non-interactive when every choice below is passed as a flag, so work
out each one before you run anything. Infer what you can from the request. Ask the user, in one
batched question, only about choices that actually matter to them and that you can't infer. Use
the defaults marked here for the rest, and say which defaults you used.

| Choice | Flag | Default if not asked |
|---|---|---|
| Project name (also the directory) | positional `NAME` | required — ask |
| Description | `--description "<text>"` | one line derived from the request |
| Author | `-a "<Name <email>>"` | `git config user.name` / `user.email` |
| Package manager | `--pkg-manager npm\|yarn` | `npm` (or `yarn` if the user uses yarn elsewhere) |
| Databases | `--db mongodb\|postgresql\|sqlite\|redis` (repeatable), or `--no-db` for none (newer CLIs; on 3.0 and older, choosing none needs the prompt: `--answer "{space}{down}{down}{space}"` to untick the defaults) | `mongodb` |
| Default routes | `--route acl\|admin\|metrics\|openapi\|push\|status` (repeatable) | `openapi`, `status` |
| React frontend | `--react` / `--no-react` | `--no-react` |
| Docker | `--docker` / `--no-docker` | `--docker` |
| Kubernetes (Helm) | `--k8s` / `--no-k8s` | `--no-k8s` |
| `/api` route prefix | `--api-route --api-version <v>` / `--no-api-route` | `--no-api-route` |
| Source control | `--scm github\|gitlab\|git\|p4\|svn\|none` | `git` if inside no repo, else `none` |
| Output directory | `--output-dir <path>` | `./<NAME>` |

Notes:
- **Always pass all four of `--route`, `--react`/`--no-react`, `--docker`/`--no-docker`,
  `--k8s`/`--no-k8s` explicitly.** They share one "additional features" prompt in the CLI.
  Passing any one of them skips that prompt, and every one you leave out falls back to its own
  default (Docker defaults to *on*).
- A persistent database (`mongodb`, `| Databases | `--db mongodb|postgresql|sqlite|redis` (repeatable), or `--no-db` for none (CLI 3.1+; older CLIs can only choose none at the prompt) | `mongodb` |`, or `sqlite`) is what enables the ACL datastore
  and RBAC (`rbac.enabled`). With only `redis`, or no database, RBAC is off. Mention this if the
  user wants protected routes or models without a persistent database.
- The `acl` default route needs a persistent database.
- Dependencies are installed automatically, which takes a while. Pass `--no-install` only if the
  user asks.
- For several projects with the same choices, the CLI also accepts `--answers <file.json>`
  (camelCase keys: `description`, `author`, `pkgManager`, `db`, `route`, `react`, `docker`,
  `k8s`, `apiRoute`, `apiVersion`, `scm`). Explicit flags override the file.

## 2. Generate

Check that the target directory doesn't already exist, or is empty. Use `--force` only if the
user explicitly agrees to overwrite. Then run, for example:

```sh
MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" --timeout 900 -- generate server my-api \
  -a "Jane Doe <jane@example.com>" --description "Product catalog service" --pkg-manager npm \
  --db mongodb --db redis --route openapi --route status --no-react --docker --no-k8s \
  --no-api-route --scm git
```

If it exits 3, a flag was missing. Add it and re-run with `--force` (the directory now partly
exists). Don't hand-answer the prompt with a guess.

## 3. Verify and hand off

1. `cd` into the project, then build and test it through the wrapper (`-- build`, then `-- test`).
   A fresh scaffold should pass both. If it doesn't, report the failure verbatim: that's a CLI
   template bug, not something to patch silently.
2. Summarize what was created: the directory, the features chosen (flag the defaults you picked),
   and the next steps. Those are usually `/rapidrest:model` to add data models, `/rapidrest:route`
   for endpoints, and `/rapidrest:serve` to run it with hot reload (in-memory databases start
   automatically, so nothing needs to be installed).

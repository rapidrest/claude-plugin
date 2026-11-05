---
name: react
description: Add and manage React frontends in a RapidREST project with the RapidREST CLI — add a React app (server-rendered, optional hydration and client-side routing), add pages with optional server-side data services, and export a static HTML site. Use when the user wants a frontend, React app, web UI, page, or static export in a RapidREST project.
argument-hint: "<app | page | export> [details]"
allowed-tools: Bash(MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *), Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *)
---

# React frontends in RapidREST

Wraps `rapidrest generate react`, `rapidrest generate react-page`, and `rapidrest react export`.
The user's request: $ARGUMENTS

Run the CLI only through the wrapper:
`MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" [--answer <text>]... -- <args>`.
If you haven't yet this session, read `${CLAUDE_PLUGIN_ROOT}/references/cli.md` first.

First, from the project root, check for existing apps: `apps/<name>/` directories (or a legacy
single `app/` directory), `src/routes/*Route.ts` classes extending `ReactRoute`, and
`vite.config.ts`.

Flags differ between CLI versions (for example, `--router` is newer). Before the first `generate
react` of the session, run `-- generate react --help` through the wrapper and use only the flags
it lists.

## A. Add an app: `generate react <name>`

| Choice | Flag |
|---|---|
| App name | positional (`app`, `admin`, `dashboard`) |
| Mount path | `-p /<path>` (default `/<name>`) |
| Client-side navigation between pages | `--router` (implies hydration) or `--no-router` |
| Client-side hydration (needed for any interactivity: state, event handlers) | `--hydrate` or `--no-hydrate` |
| Author | `-a "<author>"` |

Pass one of each pair (`--router` alone is enough, since it implies hydration). If `--help` doesn't
list `--no-router`/`--no-hydrate` (CLI 2.1.0 and earlier), answer the prompts instead, in this
order and only for those that will be asked:
1. `--router` is supported and omitted: "Enable client-side navigation?" → `--answer n`
2. Neither `--router` nor `--hydrate`: "Enable client-side hydration?" → `--answer n`

Choose hydration unless the user wants a purely static, non-interactive site. Running this again
with a different name adds another app. `vite.config.ts` and `tsconfig.client.json` are
regenerated to cover every app, and a legacy `app/` layout is migrated to `apps/<name>/`
automatically. Tell the user about the migration if it happens. Dependencies are installed
automatically (`--no-install` skips that).

```sh
MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" -- generate react app -p /app --router -a "<author>"
```

## B. Add a page: `generate react-page <app> <page>`

- `<page>` may include a subpath (`settings/profile` → `apps/<app>/settings/profile/index.tsx`).
  Class names are PascalCased from it (`SettingsProfile`).
- `--service` also writes `src/services/<Page>Service.ts`, a server-side data loader whose
  result becomes the page's props. Use it when the page needs data from the server's own models
  or datastores. Otherwise pass `--no-service`, and the page gets a client-side `fetchProps`
  helper instead. (CLI 2.1.0 and earlier lack `--no-service`; answer "create a service class?"
  with `--answer n` instead.)

```sh
MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" -- generate react-page app Dashboard --service -a "<author>"
```

Then implement the page component (and the service's data retrieval) as the user described,
following the generated file's structure.

## C. Static export: `react export`

Crawls the app and writes a static site to `dist/export/`. It boots the real server, so in-memory
databases start just as they do for `dev`. Use `-d` if the databases already run in Docker, and
`-p <port>` to choose a port.

```sh
MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" --timeout 900 -- react export
```

Limitations to mention when relevant: no dynamic or parameterized routes, hydration only works
when the site is served from `/`, and props are frozen at export time (no per-user data).

## Verify

`-- build` builds the server and the Vite client. To see the app, use `/rapidrest:serve`, which
starts `vite build --watch` alongside the server when `vite.config.ts` exists.

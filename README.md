# RapidREST: Claude Code Plugin

The official [Claude Code](https://claude.com/claude-code) plugin for
[RapidREST](https://rapidrest.dev). It lets Claude scaffold, extend, run, test, upgrade and release
RapidREST projects by driving the official [RapidREST CLI](https://github.com/rapidrest/cli). You
describe what you want, Claude works out the right CLI flags, runs the CLI, checks that the result
builds and passes its tests, and then writes the code the CLI can't generate for you (business
logic, custom endpoints, extra validation).

---

## Installation

```
/plugin marketplace add rapidrest/claude-plugin
/plugin install rapidrest@rapidrest
```

Requirements: Node.js 24 or later. The RapidREST CLI doesn't need to be installed separately: the
plugin uses a project-local or global `@rapidrest/cli` if it finds one, and otherwise falls back to
`npx @rapidrest/cli@latest`.

---

## Skills

Claude picks the right skill automatically from what you ask. You can also invoke any skill
directly with `/rapidrest:<skill>`.

| Skill | What it does | CLI commands |
|---|---|---|
| `/rapidrest:new-project` | Scaffold a new server project: databases, default routes, React, Docker, Helm, npm/yarn | `generate server` |
| `/rapidrest:model` | Add a data model with typed properties, a datastore binding, caching and RBAC | `generate model` |
| `/rapidrest:route` | Add a custom or model-backed CRUD route, or the built-in default routes | `generate route`, `generate default-route` |
| `/rapidrest:job` | Add a cron-scheduled background job | `generate job` |
| `/rapidrest:react` | Add React apps and pages, and export a static site | `generate react`, `generate react-page`, `react export` |
| `/rapidrest:auth` | Add registration and login (Basic, OTP, TOTP, Passkey, FIDO2, MFA, OIDC) | `generate auth` |
| `/rapidrest:deploy` | Add or refresh Docker/Compose and Helm configuration | `generate docker`, `generate k8s` |
| `/rapidrest:serve` | Run the dev server (hot reload, in-memory databases) or a production start, or build | `dev`, `start`, `build` |
| `/rapidrest:test` | Run the Vitest suite, optionally with coverage, and diagnose failures | `test` |
| `/rapidrest:upgrade` | Health-check a project and re-sync it with the current templates | `doctor`, `upgrade` |
| `/rapidrest:deps` | Add, remove, install and mass-upgrade dependencies | `dep add\|remove\|install\|upgrade` |
| `/rapidrest:release` | Bump the version, write the changelog, tag and push (only runs when you invoke it) | `release` |

**Examples**

```
> Create a RapidREST service called inventory-api with Postgres and Redis, deployable to Kubernetes
> Add a Product model with price, sku and optional tags, cached for 2 minutes, and a CRUD route for it under /api/v1
> Add Google and Microsoft login
> Run the server and check that GET /api/v1/products works
> Upgrade this project to the latest RapidREST templates
/rapidrest:release minor
```

---

## How it works

Every skill runs the CLI through [`scripts/rr.mjs`](./scripts/rr.mjs), a small, dependency-free
wrapper. Claude's shell has no terminal attached, and the CLI asks interactive questions for
anything not passed as a flag. Run directly in that shell, the CLI stops at the first question
and exits as though it had succeeded, without writing anything. The wrapper:

- finds the CLI: `$RAPIDREST_CLI`, then the project's `node_modules`, then the global install,
  then `npx`
- answers prompts one at a time, only once each one has appeared (`--answer`, in order)
- stops with exit code 3 and the prompt's text when a question has no answer, so Claude can ask
  you instead of guessing
- masks answers to secret-looking prompts in its log, and supports `--timeout`

Skills always pass explicit flags first and use `--answer` only for the few prompts that have no
flag. They never send real secrets through it. OIDC client secrets get placeholders, and Claude
tells you which environment variables to set instead.

Shared guidance for all skills is in [`references/cli.md`](./references/cli.md).

---

## Developing

```sh
yarn install       # dev dependencies: @inquirer/prompts for the wrapper tests, @rapidrest/cli for releases
yarn test          # wrapper behaviour + manifest/skill structure checks
yarn validate      # claude plugin validate . --strict
claude --plugin-dir .   # try the plugin locally; /reload-plugins picks up edits
```

To point the skills at a local CLI checkout instead of a published one, set `RAPIDREST_CLI` to
its `bin/run.js` (after `yarn build` in that checkout).

When you change a skill, keep its documented prompt order in sync with the CLI's source. `version` in
`.claude-plugin/plugin.json` must equal the one in `package.json` (a test enforces this).

## Releasing

Add what changed under `## Unreleased` in `RELEASE_NOTES.md`, then run `yarn release <patch|minor|major>`.
That is `rapidrest release`, as in the other RapidREST repos: it bumps `package.json` and `.claude-plugin/plugin.json`,
promotes the release notes, updates `CHANGELOG.md`, then commits, tags `v<version>` and pushes. The Release workflow
checks the tag and creates the GitHub release. Installed copies of the plugin only update when the version changes, so
release every change you want users to get.

---

## License

MPL v2.0. See [LICENSE](./LICENSE).

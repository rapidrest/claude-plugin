# claude-plugin — Design Decisions & Session Notes

This file exists so that Claude sessions working in this repo don't re-litigate settled
decisions or re-discover the same issues from scratch. It is local to this repo (not tied to
any one machine's global Claude memory), so it travels with the code.

**Maintenance rule:** when a standing decision changes, update the section below in place
(don't just append a contradiction lower down). When a new investigation/session produces a
decision, finding, or reverted approach worth remembering, add a dated entry under Session Log.
Keep entries terse — this is a reference, not a transcript.

## Agent model assignments (JP, 2026-10-28)

Standing rule for every AI agent working on this project (applies to all RapidMX and RapidREST repositories):

General code and review is to be performed with Sonnet 5.5 (`claude-sonnet-5-5`), with architecture, planning and
investigation performed by Opus 5.5 (`claude-opus-5-5`). The following table details specific sub-categories or
specialties.

When categories overlap, the more specific one wins: for example, Security & Performance (Opus) overrides Code and Code
Review (Sonnet) for security and performance topics.

| Kind of work | Model |
|---|---|
| Design (specs, plans, architecture proposals) | Opus 5.5 (`claude-opus-5-5`) |
| Code (implementation, refactoring, evaluation) | Sonnet 5.5 (`claude-sonnet-5-5`) |
| Code Review (finding and verifying defects in diffs or code) | Sonnet 5.5 (`claude-sonnet-5-5`) |
| Security & Performance (analysis, code review, planning) | Opus 5.5 (`claude-opus-5-5`) |
| Simple operations (bash/terminal commands, file operations, project initialization and similar mechanical tasks) | Haiku 5.5 (`claude-haiku-5-5`) |

## What this repo is

The `rapidrest` Claude Code plugin (also its own single-plugin marketplace): a set of skills under
`skills/` that let Claude perform everything the RapidREST CLI (`../cli`, `@rapidrest/cli`) does —
scaffolding, code generation, running, testing, upgrading, dependency management, releasing.

## Standing design decisions & constraints

- **Skills wrap the CLI; they never re-implement it.** The CLI's `templates/` are the single
  source of truth for generated code. A skill's job is everything around the CLI: gathering the
  user's choices, mapping them to flags, running it safely, verifying the result (build/test), and
  making the follow-up code edits the CLI can't. If a skill needs something the CLI can't express,
  the right fix is usually a CLI flag, not template logic duplicated in a SKILL.md.

- **Every CLI call goes through `scripts/rr.mjs`, never `rapidrest`/`rr`/`npx` directly.** Claude's
  shell has no TTY. Verified 2026-11-04: with stdin closed, an `@inquirer/prompts` prompt makes the
  CLI exit **0 having written nothing** (indistinguishable from success); piping all answers up
  front fails too (the first prompt consumes the whole buffer). `rr.mjs` keeps stdin open, waits
  for each prompt to render, types the next `--answer`, and exits 3 naming the prompt if one is
  left unanswered. `test/manifest.test.mjs` fails on any bare CLI call inside a SKILL.md code block.

- **Always prefix wrapper calls with `MSYS_NO_PATHCONV=1`.** Under Git Bash on Windows (the Bash
  tool's shell there), `--path /ping` reached the CLI as `C:/Program Files/Git/ping` and was baked
  into a generated `@Route(...)`. Side effect: with path conversion off, the script path itself must
  be a Windows path — fine, since `${CLAUDE_PLUGIN_ROOT}` substitutes as one.

- **Prompts with no "off" flag are answered positionally via `--answer`, documented per skill.**
  As of CLI 2.1.0 these have no negative flag: `generate model` (`--cache`, `--protect`, zero
  properties), `generate route` (`--api`, `--protect`), `generate react` (`--router`, `--hydrate`),
  `generate react-page` (`--service`), `generate auth` (OIDC client id/secret/custom endpoints).
  The prompt order in each SKILL.md mirrors the CLI source — if the CLI's prompt order changes,
  the skills must change with it. Adding `allowNo`/real flags for these in the CLI would let the
  skills drop the positional answers entirely (preferred long-term fix).

- **Never put real secrets through `--answer`.** OIDC client secrets are answered with
  `CHANGE_ME_*` placeholders and the user is told to set them via env vars
  (`AUTH__OIDC_<PROVIDER>__CLIENTSECRET`). The wrapper also masks answers to prompts matching
  `secret|password|token|key` in its log.

- **`release` has `disable-model-invocation: true`** — it commits, tags and pushes, so it must only
  ever run when the user explicitly invokes `/rapidrest:release`.

- **`plugin.json` `version` must equal `package.json` `version`** (enforced by
  `test/manifest.test.mjs`). `rapidrest release` only bumps `package.json`, so bump `plugin.json`
  in the same change before releasing.

- **Commit discipline.** Don't `git commit` unless explicitly asked for *that specific piece of
  work*. An autonomous-execution/"commit as you go" approval given for one approved plan (e.g. via
  plan mode) is scoped to that plan only — it does not carry forward to later, separate requests in
  the same session, even ones that look similar in kind (a follow-up review-and-fix pass, a
  refactor, a new feature), and even after a full review-and-fix cycle with passing tests. Default
  to leaving changes staged/unstaged and saying so; only commit automatically within the exact
  scope of a plan that was explicitly approved as autonomous. If unsure whether new work falls
  inside that scope, treat it as outside and ask.
  
- **Commit message style: a flat list of one-line, verb-led items — no summary/title line, no
  `-`/`*` bullet markers.** This isn't just a style preference — it's dictated by how `release`
  actually builds `CHANGELOG.md`. `collectChangelogBullets`/`classifyChangelogLine`
  (`src/lib/release.ts`) parse `git log --pretty=format:%B` and treat **every non-blank line of a
  commit's full message as its own changelog bullet** — there is no subject/body distinction. A
  conventional "short imperative subject + blank line + prose body" commit therefore leaks one
  changelog bullet per body sentence, and a `-`/`*`-prefixed line breaks `classifyChangelogLine`'s
  verb detection (it reads the line's first whitespace-delimited word as the verb; a leading `-`
  defeats that lookup and the dash leaks into the changelog text as `"- - Added foo"`). Correct
  format:
  - No separate summary/title line — if a commit needs an overview, that overview is itself just
    one more flat line, not a heading distinct from the rest.
  - No bullet-marker prefix of any kind — write bare lines.
  - Lead each line with an imperative verb where it fits: `Add`/`Fix`/`Remove` (and `-ing` forms)
    are recognized and become `Added`/`Fixed`/`Removed` entries; `Configuring`/`Converting`/
    `Refactoring`/`Updating`/etc. become `Changed`. Anything else still works, defaulting to
    `Changed` verbatim — see `CHANGELOG_VERB_REWRITES` in `src/lib/release.ts` for the full map.
  - A blank line before a trailing git trailer (`Co-Authored-By:`, `Signed-off-by:`, etc.) is fine
    — trailers matching `CHANGELOG_NOISE_PATTERNS` are dropped from the changelog — but nothing
    else should follow the item list.
  This mirrors JP's standing convention across his other repos; copy this exact rule verbatim into
  each sibling repo's own NOTES.md rather than paraphrasing it, since the paraphrase is what caused
  this to be gotten wrong in the first place (see the 2026-09-07 Session Log entry below).

## Session Log

### 2026-11-04 — Initial plugin

Created the repo with 12 skills (`new-project`, `model`, `route`, `job`, `react`, `auth`,
`deploy`, `serve`, `test`, `upgrade`, `deps`, `release`), the `rr.mjs` wrapper, the shared
`references/cli.md`, and `node:test` suites (wrapper behaviour against real `@inquirer/prompts`
via `test/fixtures/fake-cli.mjs`, plus manifest/skill structure checks).

End-to-end verification (2026-11-04), driving every step through `rr.mjs` exactly as the skills
do (`RAPIDREST_CLI` → the `../cli` checkout, rebuilt): `generate server` (mongodb, npm, openapi +
status) → `generate model` (one `--answer n` for the cache prompt) → `generate route --api 1 -m
<Model> --protect` → `generate job` → `test` → `doctor --json` → `upgrade --json` → `dev` in the
background, `curl` `/status` (200) and `/api/v1/items`, then TaskStop: the port was freed and no
`mongod` was left behind. Model-backed route tests passed 8/8. Findings, all in the CLI, not here:
- **Published `@rapidrest/cli@2.1.0` on npm is missing `templates/server/src/` and
  `tsconfig.json`** (the packaging bug `6631dc3` fixed but which hasn't been released yet). Every
  `generate server` through npx, or through a stale global install, produces an unbuildable project.
  Documented in `references/cli.md` under "Known CLI issues". Remove that note once a fixed version
  ships.
- `templates/job/test/jobs/{{name}}.test.ts` imports `./config` (should be `../config`), and its
  empty async arrow functions fail the generated project's own `typescript/no-empty-function` lint
  rule, so `build` and `test` fail as soon as any job exists.
- `generate model --datastore <unknown>` patches an empty, type-less datastore block into
  `src/config.ts` only (not `test/config.ts`).
- `generate model`/`route`/`job` print "generated at: <project root>/<Name>.ts", but the files
  actually land in `src/models|routes|jobs/`.

### 2026-11-04 — review of CLI commits 38cea81..9b9c47f
- Templates now ship as GitHub releases (`templates-v*`) cached in ~/.rapidrest/templates; a checkout uses its own templates/. Documented in references/cli.md ("Where the templates come from") and the upgrade skill (`--latest`, `templates` in `upgrade --json`, `rapidrest.templates` in package.json).
- Re-ran e2e against the checkout: server/model/route/doctor/upgrade OK, route tests 8/8. Still broken: job test template (`./config` import, empty async bodies), so the job skill and cli.md now tell Claude to fix it after generating.
- Still unfixed in the CLI: unknown `--datastore` patches an empty block, wrong "generated at" paths, no `--no-*` flags for cache/protect/api/hydrate/service.
- Generated projects pin `@rapidrest/cli: ^<scaffolding CLI>`; with only 2.1.0 on npm, the project-local CLI is still the broken 2.1.0 until the next release.

### 2026-11-04 — CLI fixes for the issues the plugin found (uncommitted in the CLI repo)
- The CLI now has a flag for every generate prompt (`--no-cache/--no-protect/--no-properties/--datastore-type/--update-docker/--update-k8s` on model, `--no-api/--no-protect` on route, `--no-router/--no-hydrate`, `--no-service`, and `--oidc-client-id`, `--oidc-credentials-from-env`, `--oidc-custom-*` on auth). Skills now pass these, with the old positional `--answer` sequences kept as the fallback for CLI <= 2.1.0 (detected by `Nonexistent flag`).
- Known remaining CLI bug: the route test template only starts the in-memory MongoDB when the route's own model is on MongoDB, so a SQL-model route in a project with a MongoDB acl datastore hangs in beforeAll. Documented in references/cli.md.
- Yarn with `nodeLinker: node-modules`, as in the sibling repos (an accidental PnP install was replaced). `.yarnrc.yml` pre-approves `@rapidrest/*` past Yarn 4.18's minimum-release-age quarantine so a just-published CLI can be added. Releases use `yarn release <bump>` (= `rapidrest release`, which bumps plugin.json too since CLI 3.2.0); CI is `.github/workflows/build.yml` (tests + pinned `claude plugin validate --strict`) and `release.yml` (tag check + GitHub release).

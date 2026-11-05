# Running the RapidREST CLI from a skill

Every RapidREST skill drives the official `@rapidrest/cli` (`rapidrest`, alias `rr`). The skills
never re-implement what the CLI does: its templates are the single source of truth for generated
code. Skills add the parts the CLI can't do on its own: asking the user the right questions,
mapping the answers to flags, checking the result, and then making the follow-up code edits.

`${CLAUDE_PLUGIN_ROOT}` below stands for the plugin's root directory. The skill that sent you here
gives the real, already-substituted path.

## Always go through the wrapper

Run every CLI command through the bundled wrapper, never `rapidrest`/`rr`/`npx` directly:

```sh
MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" [--answer <text>]... [--cwd <dir>] [--timeout <sec>] -- <rapidrest args...>
```

Why: Claude's shell has no TTY. Called directly, the CLI stops at the first interactive prompt
and **exits 0 having written nothing**, which looks like success. The wrapper keeps stdin open,
waits for each prompt to render, and only then types the next `--answer`. If a prompt shows up
with no answer left, it stops the CLI and exits **3**, printing `[rr] UNANSWERED PROMPT: <text>`.

- **Use flags, not answers.** CLI versions after 2.1.0 have a flag for every prompt (including
  `--no-*` forms to decline a feature), so a fully flagged command never stops. If the wrapper
  fails with `Nonexistent flag`, the CLI is 2.1.0 or older. Then drop that flag and use the
  `--answer` fallback the skill documents, giving the answers in the order the prompts appear.
- **Exit 3** means a question went unanswered. Read the prompt text, then either add the missing
  flag or ask the user. Don't guess at an answer the user cares about.
- An empty answer (`--answer ""`) accepts the prompt's default. For select/checkbox prompts, use
  key tokens: `{down}`, `{up}`, `{space}`. Enter is always sent after each answer.
- **`MSYS_NO_PATHCONV=1`** stops Git Bash on Windows from turning arguments like `--path /products`
  into `C:/Program Files/Git/products`. It's harmless everywhere else, so always include it. In
  PowerShell, drop the prefix and call `node "<path>/rr.mjs" ...` directly.
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" --which` prints which CLI install will be used and
  its version. Resolution order: `$RAPIDREST_CLI` (a path to a `bin/run.js` checkout, useful when
  developing the CLI itself), the project's `node_modules/@rapidrest/cli`, the global npm install,
  `rapidrest` on PATH, and finally `npx -y @rapidrest/cli@latest`. If `--which` reports a global
  install of 2.1.0 or older, tell the user to update it (`npm i -g @rapidrest/cli@latest`): those
  versions bundle broken templates and lack most flags.
- When you're unsure which flags a command supports in the installed version, run it with `--help`
  through the wrapper before guessing.
- Long-running commands (`dev`, `start`) never exit on their own. Run them with the Bash tool's
  `run_in_background`, and stop them with TaskStop when you're done.

## Where the templates come from

CLI versions after 2.1.0 no longer bundle the templates. Every command that renders templates
downloads the newest compatible **templates release** (GitHub releases of `rapidrest/cli`, tagged
`templates-v<version>`), verifies it, and caches it in `~/.rapidrest/templates`
(`$RAPIDREST_HOME/templates`). A source checkout of the CLI uses its own `templates/` instead.

- The first run needs network access. Offline, the newest usable cached copy is used, with a
  warning. If you see `Could not download the RapidREST templates ... and no usable copy is
  cached`, tell the user. If the message mentions rate limiting, suggest setting `GITHUB_TOKEN`.
- Inside a project, only templates from the major version recorded in `package.json`
  (`"rapidrest": { "templates": "<version>" }`) that match the installed `@rapidrest/*` majors are
  used. Moving to a new templates major is a deliberate `upgrade --latest` (see the upgrade skill).
- `--templates <version|dir|zip>` (or `RAPIDREST_TEMPLATES`) pins the templates. Use it only when
  the user asks for a specific version, or is testing local templates.
- New projects get a `@rapidrest/cli` devDependency on the CLI that scaffolded them, so once
  their dependencies are installed the wrapper resolves that project-local CLI.

## Known CLI issues

- **`generate job`'s test fails lint and test** (CLI 2.1.0 and earlier, which bundle their
  templates). `test/jobs/<Name>.test.ts` imports `./config` instead of `../config`, and its empty
  async test bodies trip `typescript/no-empty-function`. After generating a job, fix the import and
  fill in the test bodies (that's the follow-up anyway). Mention to the user that this is a
  template bug fixed in newer releases.
- **Mixed datastores: a route test hangs in `beforeAll`** when the route's model is on a SQL
  datastore but the project also has MongoDB (e.g. the `acl` datastore). The generated test only
  starts the in-memory MongoDB when the route's own model uses it. Start one in the test as the
  MongoDB routes' tests do (`MongoMemoryServer` on port 9999), and tell the user.
- **`@rapidrest/cli` 2.1.0 as published on npm has a packaging bug.** Its server template is
  missing `src/` (`config.ts`, `server.ts`) and `tsconfig.json`, so `generate server` produces a
  project that can't build, and later `generate model`/`route` fail with `Patch target file not
  found: src/config.ts` (still leaving partial files behind). Older global installs that also
  report 2.1.0 can have the same problem. If you see this, tell the user that their CLI install
  is broken, rather than trying to patch the project. They need a newer release, or they can set
  `RAPIDREST_CLI` to a working checkout's `bin/run.js`.

## Before a project-level command

- Commands other than `generate server` must run from the **project root**: the directory with
  `package.json` and `src/config.ts`. Pass `--cwd <root>` if your shell is somewhere else.
- **Author:** every `generate` command prompts for an author unless `-a/--author` is passed. Use
  `author` from the project's `package.json`, otherwise `git config user.name`/`user.email` as
  `Name <email>`. Ask the user only if both are missing.
- **Datastores:** `src/config.ts` has a `datastores` block. Each entry's key is the datastore
  *name* that models bind to, and its `type` is a TypeORM driver literal (`mongodb`, `postgres`,
  `better-sqlite3`) or `redis`. Read it before picking `--datastore` values.

## After generating

- Read the files the CLI reported, then make any follow-up edits the user asked for (business
  logic, extra validation, wiring). Generated code follows the project's conventions, so match it.
- Unless the user asked you not to, verify with the project's own toolchain:
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" -- build` and then `-- test`. A generated file that
  doesn't compile against the installed `@rapidrest/*` versions is a real bug. Report it rather
  than hiding it, and suggest `rapidrest doctor` (the `upgrade` skill) if the project looks
  out of date.
- Don't commit. Leave the changes for the user to review unless they asked you to commit.

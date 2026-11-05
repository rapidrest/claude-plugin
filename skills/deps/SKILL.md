---
name: deps
description: Manage a RapidREST project's npm/yarn dependencies through the RapidREST CLI — add, remove, install, and mass-upgrade packages to their latest versions (beyond semver ranges) with dry-run and exclusions. Use when the user wants to add/remove/install/update/upgrade packages or dependencies in a RapidREST project.
argument-hint: "<add | remove | install | upgrade> [packages...]"
allowed-tools: Bash(MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *), Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *)
---

# Manage RapidREST project dependencies

Wraps `rapidrest dep add|remove|install|upgrade`, which detect npm vs yarn from the project
(`packageManager` field, then `yarn.lock`). The user's request: $ARGUMENTS

Run the CLI only through the wrapper:
`MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" [--answer <text>]... -- <args>`.
If you haven't yet this session, read `${CLAUDE_PLUGIN_ROOT}/references/cli.md` first.

Run from the project root. None of these prompt. Give the network-bound ones a generous
`--timeout` (e.g. 900).

| Task | Command |
|---|---|
| Add packages | `-- dep add <pkg>[@version]...`, plus `-D` for devDependencies |
| Remove packages | `-- dep remove <pkg>...` |
| Install from `package.json` | `-- dep install` |
| Preview a mass upgrade | `-- dep upgrade --dry-run` |
| Upgrade everything to latest | `-- dep upgrade` (`--exclude <pkg>` repeatable, `--peer` includes peerDependencies) |
| Upgrade or pin specific packages | `-- dep upgrade <pkg>[@version]...` |

## Mass upgrades: be deliberate

`dep upgrade` moves packages to their **latest** published version, crossing major versions. So:
1. Run `--dry-run` first and show the user the list, calling out major-version jumps.
2. Consider excluding packages that the `@rapidrest/*` libraries constrain. Check the
   installed `@rapidrest/core`/`@rapidrest/service-core` `package.json` peer and dependency ranges
   for `typescript`, `typeorm`, `redis`, `eslint`, and `vitest`. A known example: TypeScript 7
   breaks Yarn's TypeScript compat patch, and `eslint-plugin-import` doesn't support eslint 10.
3. After upgrading, run `-- build` and `-- test`. If something breaks, identify which upgraded
   package caused it, then fix the code or re-pin that package (`-- dep upgrade <pkg>@<version>`).
   Report what you did.

For re-syncing the RapidREST-owned pins and boilerplate, use `/rapidrest:upgrade` instead.

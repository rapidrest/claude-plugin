---
name: release
description: Cut a new version of a RapidREST project with the RapidREST CLI — bump package.json, promote RELEASE_NOTES.md, generate the CHANGELOG from commits, update Helm chart versions, then commit, tag, and push.
argument-hint: "<major | minor | patch | premajor | preminor | prepatch | prerelease | x.y.z> [--preid rc] [--no-push]"
disable-model-invocation: true
---

# Release a RapidREST project

Wraps `rapidrest release`. The user's request: $ARGUMENTS

Run the CLI only through the wrapper:
`MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" [--answer <text>]... -- <args>`.
If you haven't yet this session, read `${CLAUDE_PLUGIN_ROOT}/references/cli.md` first.

This skill only runs when the user invokes it directly, because a release **commits, tags, and
pushes**. Still confirm the computed version before the real run.

## 1. Preflight (read-only)

From the project root:
1. `git status --porcelain` must be empty. The command refuses a dirty tree. If it isn't empty,
   stop and tell the user. Don't commit or stash for them.
2. `RELEASE_NOTES.md` must contain a `## Unreleased` heading, or the command fails before
   changing anything. If the section is missing or empty, offer to draft it from
   `git log <last-tag>..HEAD`, but the user must review and commit that draft before releasing.
3. Work out the bump. Use the user's argument, or suggest one from the commits since the last tag
   (breaking change → major, feature → minor, fix → patch). Prerelease strategies take
   `--preid <id>` (e.g. `rc`).
4. Dry run, which changes nothing:
   ```sh
   MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" -- release <bump> --dry-run
   ```
   Show the computed version and ask the user to confirm it, and whether to push (`--no-push`
   keeps the commit and tag local).

## 2. Release

Only after the user confirms:

```sh
MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" --timeout 600 -- release <bump> [--preid <id>] [--no-push]
```

This bumps `package.json` and promotes `## Unreleased` to `## v<version>`. It also builds the
`CHANGELOG.md` entry from commit messages, where every non-blank line of a commit message becomes
one bullet, classified by its leading verb (Add/Fix/Remove → Added/Fixed/Removed). If `helm/`
exists, it updates `appVersion`/`image.tag`. Finally it commits, tags `v<version>`, and pushes.

## 3. Report

Report the version, the tag, whether the release was pushed, and the new `CHANGELOG.md` entry.
If the push failed (auth, a protected branch), the commit and tag still exist locally. Say so,
and give the `git push --follow-tags` command for the user to run. Don't retry with force.

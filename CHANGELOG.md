# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

## [0.2.0] - 2026-11-05

### Added
- Added the RapidREST Claude Code plugin and its single-plugin marketplace
- Added scripts/rr.mjs, which runs the RapidREST CLI without a terminal: it resolves the CLI (RAPIDREST_CLI, the project's, the global install, PATH, then npx), answers each interactive prompt only once it appears, masks secret answers, and fails with exit 3 naming any prompt left unanswered instead of the CLI's silent exit 0
- Added skills for every CLI command: new-project, model, route, job, react, auth, deploy, serve, test, upgrade, deps and release, each mapping the user's request to flags and following up with edits, build and test
- Added references/cli.md, the guidance every skill shares: running through the wrapper, flags before answers with a fallback for CLI 2.1.0 and earlier, where templates come from, and known CLI issues
- Added tests for the wrapper against real inquirer prompts and for the manifests and skills staying consistent
- Added generate server --no-db to the new-project skill, with the prompt answer that chooses no databases on older CLIs
- Added a warning to update a global RapidREST CLI install of 2.1.0 or older, which the wrapper would otherwise pick before npx
- Added CI: a Build workflow running the tests and claude plugin validate --strict on every push and pull request, and a Release workflow that checks a v* tag matches the plugin version and creates its GitHub release
- Added yarn release, which runs rapidrest release as in the other RapidREST repos and bumps plugin.json with package.json

### Changed
- Updated the known CLI issues with the generated route test bugs fixed in templates 1.2 (the mixed-datastore hang, the anonymous findById 403 and the model-less hello assertion) and how to fix them in older projects
- Configured Yarn with the node-modules linker and a packageManager pin, as in the other RapidREST repos, pre-approving @rapidrest packages past Yarn's minimum-release-age quarantine
- Updated the README with how to validate and release

[Unreleased]: rapidrest/claude-plugin/compare/v0.2.0...HEAD
[0.2.0]: rapidrest/claude-plugin/releases/tag/v0.2.0

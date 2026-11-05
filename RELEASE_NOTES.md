# Release Notes

## Unreleased

## v0.2.0

Initial release of the RapidREST Claude Code plugin.

- Skills covering every RapidREST CLI command: `new-project`, `model`, `route`, `job`, `react`, `auth`, `deploy`, `serve`, `test`, `upgrade`, `deps`, `release`
- `scripts/rr.mjs`, a wrapper that runs the CLI safely without a TTY: it answers prompts one at a time and fails loudly on unanswered ones
- Installable as its own marketplace: `/plugin marketplace add rapidrest/claude-plugin`

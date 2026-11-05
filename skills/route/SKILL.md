---
name: route
description: Add REST endpoints to an existing RapidREST project with the RapidREST CLI — a custom route handler, a full CRUD ModelRoute bound to a data model, or RapidREST's built-in default routes (ACL, admin, metrics, OpenAPI, push, static files, status). Use when the user wants a new route, endpoint, controller, API, or CRUD for a model in a RapidREST project.
argument-hint: "<RouteName | default-route types> [requirements]"
allowed-tools: Bash(MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *), Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *)
---

# Add RapidREST routes

Wraps `rapidrest generate route` and `rapidrest generate default-route`. The user's request:
$ARGUMENTS

Run the CLI only through the wrapper:
`MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" [--answer <text>]... -- <args>`.
If you haven't yet this session, read `${CLAUDE_PLUGIN_ROOT}/references/cli.md` first.

First, from the project root, read `src/routes/` (existing routes, and whether they use
`@ApiRoute`), `src/models/`, and `package.json` (`author`).

## A. Custom or model-backed route: `generate route`

A route bound to a model extends `ModelRoute` and gets full CRUD for free: `HEAD`/`GET`/`POST`/
`DELETE` on `/<path>`, and `GET`/`PUT`/`DELETE` on `/<path>/:id`, plus `PUT /<path>/:id/:property`.
A test file is always written to `test/<Name>.test.ts`.

| Choice | How to pass it |
|---|---|
| Name | positional, conventionally ending in `Route` (`ProductRoute`) |
| Description | `-d "<text>"` |
| Author | `-a "<author>"` |
| Base path | `--path /products`, **without** the `/api/v1` prefix when using `--api` |
| API route | `--api <version>` → `@ApiRoute(path, version)`, served under `/api/v<version>`; or `--no-api` |
| Model | `-m <ModelName>` (must already exist in `src/models/`) or `--no-model` |
| RBAC protection | `--protect` or `--no-protect` |

Always pass one of each pair. If the model doesn't exist yet, create it first with
`/rapidrest:model`. Don't let the CLI's nested "+ New model..." flow run.

Follow the project's existing convention: if other routes use `@ApiRoute`, use `--api` with the
same version.

```sh
MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" -- generate route ProductRoute \
  -a "Jane Doe <jane@example.com>" -d "Product catalog endpoints" --path /products --api 1 -m Product --no-protect
```

**CLI 2.1.0 and earlier** lack `--no-api` and `--no-protect`; the wrapper fails with
`Nonexistent flag`. Drop them and answer the prompts instead, in this order: "Is this an API
route?" → `--answer n`, then "Enable RBAC-based protection?" → `--answer n`.

After generating, read the route and test files. Then add the custom endpoints and logic the user
asked for, following the patterns in the generated file (decorators such as `@Get`/`@Post`,
`@Auth`, `@Param`/`@Query`, and `@Protect`), and extend the generated tests to cover them.

## B. Built-in routes: `generate default-route`

Types: `acl`, `admin`, `metrics`, `openapi`, `push`, `static`, `status`. This is fully
flag-driven, so pass all of these:

```sh
MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" -- generate default-route \
  -a "<author>" --type openapi --type status --no-api-route
```

- API prefix: `--api-route --api <version>` to use `@ApiRoute`, or `--no-api-route` (always pass
  one of these). Match the project's existing routes.
- `static` also needs `--static-path <dir>` (default `public`). It patches `static_files` into
  `src/config.ts`.
- `acl` binds to `AccessControlListMongo` or `AccessControlListSQL` automatically, and needs
  a persistent datastore.
- `--force` regenerates existing default-route files. Confirm with the user first.

## Verify

Build and test through the wrapper (`-- build`, `-- test`). For a quick manual check, offer to
start the server with `/rapidrest:serve` and call the endpoint.

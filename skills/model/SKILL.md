---
name: model
description: Add a data model (entity) to an existing RapidREST project with the RapidREST CLI — typed properties, datastore binding (MongoDB/PostgreSQL/SQLite), Redis caching TTL, RBAC protection. Use when the user wants a new model, entity, schema, collection, or table in a RapidREST project.
argument-hint: "<ModelName> [properties / requirements]"
allowed-tools: Bash(MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *), Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *)
---

# Add a RapidREST data model

Wraps `rapidrest generate model`. The user's request: $ARGUMENTS

Run the CLI only through the wrapper:
`MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" [--answer <text>]... -- <args>`.
If you haven't yet this session, read `${CLAUDE_PLUGIN_ROOT}/references/cli.md` first.

## 1. Inspect the project

From the project root, read:
- `src/config.ts`: the `datastores` block. Note each datastore's **name** (its key) and its
  `type`. `acl` is internal, so never bind a model to it.
- `src/models/`: the existing models, so you match naming and don't collide.
- `package.json`: `author`, used for `-a`.

## 2. Settle the answers

| Choice | How to pass it |
|---|---|
| Name | positional, PascalCase singular (`Product`, `UserProfile`) |
| Description | `-d "<text>"` |
| Author | `-a "<author>"` |
| Datastore | `--datastore <name>`: an existing datastore name from `config.ts` (the scaffold's MongoDB one is `mongo`, not `mongodb`) |
| Properties | `--property name:type` (repeatable). Types: `string`, `number`, `boolean`, `string[]`, `number[]`, `Date`, or any TS type. Append `?` for optional: `"bio:string?"`. Or `--no-properties` |
| Caching | `--cache <ttl-seconds>` (needs a `redis` datastore to be useful), or `--no-cache` |
| RBAC protection | `--protect` or `--no-protect` |

Rules:
- Every model already has a `name: string` `@Identifier` field, used for REST lookups. Never
  pass `name`, `uid`, `id`, `_id`, `version`, `dateCreated`, or `dateModified` as properties.
- Quote `--property` values that contain `?` or `[]`.
- Always pass one of each pair above, so no prompt is left.

### The model needs a datastore that doesn't exist yet

Pass `--datastore <new-name> --datastore-type mongodb|postgres|sqlite`. The CLI adds the datastore
to `src/config.ts` and `test/config.ts` (tests use in-memory sqlite for SQL), and installs the
driver. Confirm the name and type with the user, and tell them a new database was added. If the
project has `docker-compose.yml` or `helm/Chart.yaml`, also pass `--update-docker`/`--no-update-docker`
and `--update-k8s`/`--no-update-k8s`. Updating regenerates those files and overwrites any hand
edits, so check `git log`/`git diff` on them and ask the user if they've been customized.

### Older CLIs (2.1.0 and earlier)

These lack `--no-cache`, `--no-protect`, `--no-properties`, `--datastore-type` and the update flags.
The wrapper then fails with `Nonexistent flag`. Drop those flags and answer the prompts instead,
**in this order** and only for those that will be asked:

1. A new datastore: omit `--datastore`. If the project already has datastores (other than `acl`),
   answer the select with `{down}` once per listed datastore (e.g. `"{down}{down}"` for two).
   Otherwise answer "Set up a new database?" with `y`. Then for "Select database type", answer
   `""` for MongoDB, `"{down}"` for PostgreSQL or `"{down}{down}"` for sqlite. The datastore is
   named after its type. On these versions, never pass an unknown `--datastore`: it writes an
   empty, type-less config block that the server can't start with.
2. Caching declined: `n`. 3. Protection declined: `n`. 4. No properties: `""`.
5. After a new datastore: "Update docker files?" / "Update Kubernetes (Helm) files?" → `y` or `n`.

## 3. Generate

```sh
MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" -- generate model Product \
  -a "Jane Doe <jane@example.com>" -d "A product in the catalog" --datastore mongo --no-cache --protect \
  --property price:number --property "tags:string[]" --property "summary:string?"
```

`--force` overwrites an existing model file. Use it only with the user's agreement.

## 4. Follow up

- Read `src/models/<Name>.ts`. Add whatever the CLI can't express: custom validation, enums,
  relations, indexes, richer descriptions. Keep the generated decorators and constructor/copy
  logic consistent with any property you add by hand.
- Offer to generate a CRUD route for it with `/rapidrest:route` (`--model <Name>`).
- Build and test through the wrapper (`-- build`, `-- test`).

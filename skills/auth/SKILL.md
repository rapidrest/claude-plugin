---
name: auth
description: Add user authentication to a RapidREST project with the RapidREST CLI and @rapidrest/auth — registration, user admin, and login via HTTP Basic, OTP, TOTP, Passkey, FIDO2, MFA, or OAuth 2.0/OpenID Connect (Google, Apple, Facebook, Microsoft, custom). Use when the user wants login, sign-up, accounts, sessions, SSO, or social login in a RapidREST project.
argument-hint: "[login methods / providers]"
allowed-tools: Bash(MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *), Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" *)
---

# Add authentication

Wraps `rapidrest generate auth`. The user's request: $ARGUMENTS

Run the CLI only through the wrapper:
`MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" [--answer <text>]... -- <args>`.
If you haven't yet this session, read `${CLAUDE_PLUGIN_ROOT}/references/cli.md` first.

## 1. Settle the answers

Read `src/config.ts` (datastores, the `auth:` block) and `src/routes/` first. If `AuthBasicRoute`
or `RegistrationRoute` already exists, auth has already been generated: confirm with the user
before re-running, and use `--force` only with their agreement.

| Choice | Flag |
|---|---|
| Backing datastore | `--datastore-type sql\|mongo`. Prefer whichever the project already uses. |
| SQL engine, if no `sql` datastore exists yet | `--sql-type postgres\|better-sqlite3` |
| Login methods | `--method basic\|otp\|totp\|passkey\|fido2\|mfa\|oidc` (repeatable) |
| OIDC providers, with `oidc` | `--oidc-provider google\|apple\|facebook\|microsoft\|custom` (repeatable) |
| Default admin account on first boot | `--default-accounts` |
| Author | `-a "<author>"` |

`@rapidrest/auth`'s models bind to a datastore literally named `sql` or `mongo`. The CLI reuses
one with that exact name or creates it in `config.ts`. Tell the user if a new one gets created
alongside their existing datastores.

Always generated: `src/models/auth.ts`, plus the Registration, User (admin CRUD), AuthLogout,
AuthElevation (`/auth/elevation`, in newer CLI versions) and Secret routes. Each method adds its
own `Auth<Method>Route`, and each OIDC provider adds `Auth<Provider>Route`.

## 2. OIDC credentials: never collect secrets in chat

Always pass `--oidc-credentials-from-env`. The CLI then leaves client secrets empty in
`config.ts` instead of prompting for them. Client IDs aren't secret: if the user gives one, pass
`--oidc-client-id <provider>=<id>` (repeatable). Any not given are left empty too.

For `custom`, ask the user for the endpoints (they aren't secret) and pass them all:
`--oidc-custom-authorization-url`, `--oidc-custom-token-url`, `--oidc-custom-profile-url` (optional),
`--oidc-custom-protocol openid|oauth2` (default `openid`), and for `openid`,
`--oidc-custom-issuer` and `--oidc-custom-jwks-uri`. Add `--oidc-custom-scope <scope>`
(repeatable) if the defaults (`openid email profile`) aren't right.

Afterwards, tell the user to supply the real values through the environment instead of
committing them, e.g. `AUTH__OIDC_GOOGLE__CLIENTID` / `AUTH__OIDC_GOOGLE__CLIENTSECRET` (nconf
`__` nesting over the `auth.oidc_<provider>` config block). Also tell them to verify each
preset's endpoints against the provider's current `.well-known/openid-configuration`.

**CLI 2.1.0 and earlier** have none of these OIDC flags (the wrapper fails with
`Nonexistent flag`). Answer the prompts instead. For each provider, in `--oidc-provider` order,
the CLI asks for a Client ID and then a Client Secret: answer `--answer "CHANGE_ME_CLIENT_ID"
--answer "CHANGE_ME_CLIENT_SECRET"`, never real credentials. `custom` then also asks, in order:
Authorization URL, Token URL, Profile URL (may be blank), Protocol (`""` = OpenID Connect,
`"{down}"` = OAuth 2.0), Issuer and JWKS URI (OpenID Connect only), and Scopes. On those versions
answer Scopes with `"openid,email,profile"`, not blank, because they split the default
`openid email profile` into a single scope.

## 3. Generate

```sh
MSYS_NO_PATHCONV=1 node "${CLAUDE_PLUGIN_ROOT}/scripts/rr.mjs" --timeout 900 -- generate auth \
  -a "<author>" --datastore-type mongo --method basic --method oidc --oidc-provider google \
  --oidc-credentials-from-env --default-accounts
```

Dependencies (`@rapidrest/auth`, `argon2`, and `otplib`/`@simplewebauthn/server`/`jwks-rsa` as
needed) are installed automatically.

## 4. Follow up

- Build and test through the wrapper.
- Explain how to call the login endpoints, and that `UserRoute` is deny-by-default (grant access
  through `trusted_roles`). Also point out that the `auth.secret`/`cookie_secret` values in
  `config.ts` must be overridden in production.
- Session refresh and profile/alias management routes aren't scaffolded (nor elevation on older
  CLI versions without `AuthElevationRoute`; it's needed for any `@RequiresElevation` action).
  Offer to hand-write them as thin subclasses of `@rapidrest/auth`'s base routes, following the
  generated files' pattern.

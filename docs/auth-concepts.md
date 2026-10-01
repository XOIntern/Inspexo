# Auth concepts — contract for consumer teams

Five terms, five different things. Do not conflate them.

## Authentication — WHO (401 territory)

Cookie → PASETO decrypt → `Session` row → `User` row, on every request.
Entry point: `requireRequestUser(req)` (`src/lib/auth/session.ts`).
Failures (missing/garbage/expired/revoked token, deleted user) collapse to
one generic `401`. No reason is ever given — a reason would confirm or deny
account existence to strangers.

## Authorization — MAY THEY (403 territory)

Decided **after** identity is proven, so specificity is safe and useful.
Entry points: `requireAdmin`, `requireRole`, `requireSiteAccess`
(`src/lib/auth/authorize.ts`). All throw; none return booleans.

## Role — a data column

`User.role`, assigned by an admin, never by the user, never carried in the
token. A role change takes effect on the next request — no reissue, no
waiting out an expiry. `admin` is a system concept, not a seniority level:
business roles never acquire administrative power.

## Permission — code, not data

Capabilities are derived from roles in code. There is deliberately **no**
permissions table and no role-permission join: a database edit must never
grant capability nobody reviewed. The HSE permission vocabulary itself
(`finding.*`, `audit.*`, …) is domain logic and lives with the domain —
this layer only provides the `requireRole` hook it plugs into.

## Site scope — join rows, the only source

`UserSite` rows are the entire facility-access model. `requireSiteAccess`
is one indexed existence check for every role; the auditee single-site rule
falls out of the data (exactly one row exists), not a code branch.
Cardinality is enforced at provisioning time (`provisionUser`).

## Endpoint map

| Endpoint | Meaning |
|---|---|
| `POST /api/auth/login` | prove identity, open a session |
| `POST /api/auth/logout` | revoke the session everywhere, clear the cookie |
| `GET /api/auth/me` | canonical current user (safe shape only) |
| `GET /api/auth/session` | legacy alias of `/me`, identical by construction |
| `POST /api/auth/verify-email` | redeem a verification token, no session needed |
| `POST /api/auth/resend-verification` | reissue + resend the caller's own link (throttled) |

The safe shape is `id, name, email, role, status, department, siteIds,
emailVerified, mustChangePassword`. `passwordHash`, tokens, and verification
secrets never leave the server — asserted by tests, not just by review.

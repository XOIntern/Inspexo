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

Capabilities are derived from roles in `permissions.ts`, where review
happens. There is deliberately **no** permissions table: a database edit
must never grant capability nobody reviewed. The map is a minimal coarse
vocabulary (`user.manage`, `audit.conduct`, `inspection.daily`, …);
the HSE domain extends it when its features land — adding a verb is a code
change, which is the point. `requirePermission(user, perm)` enforces it
(403 `FORBIDDEN_PERMISSION`); unknown roles hold zero permissions.

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

## Admin plane (`/api/admin/*` — admin role required on every route)

The UI consumes these; it never touches the database. Mutations reuse the
tested backend functions, so the rules (cardinality, single-admin guards,
no `admin` assignment) are identical to the helper layer.

| Endpoint | Meaning |
|---|---|
| `GET /api/admin/users` | list with `search`/`role`/`status`/`siteId` + `page`/`pageSize` |
| `POST /api/admin/users` | provision one user; `tempPassword` returned once (201) |
| `GET /api/admin/users/[id]` | detail with site objects + verification flags |
| `PATCH /api/admin/users/[id]/role` | change role (cardinality must already hold) |
| `PUT /api/admin/users/[id]/sites` | replace site assignments wholesale |
| `PATCH /api/admin/users/[id]/status` | activate/deactivate (never self) |
| `POST /api/admin/users/import` | bulk create without credentials (per-row envelope) |
| `POST /api/admin/users/credentials` | batch credential generation; the response is the export |
| `GET /api/admin/sites` | site list for assignment pickers |

The safe shape is `id, name, email, role, status, department, siteIds,
emailVerified, mustChangePassword`. `passwordHash`, tokens, and verification
secrets never leave the server — asserted by tests, not just by review.

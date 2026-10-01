# Admin provisioning — operator runbook

Phase 3: users are created **only** via `provisionUser()` in
`src/lib/auth/provision.ts`. There is no public registration and no
`/register` endpoint. The caller must be an active `admin`; business roles
(`verificator`, `auditor`, `auditee`) can never provision.

## Session key (development)

Login sessions are PASETO v3.local tokens sealed with a 32-byte key stored
as a PASERK string (`k3.local.…`, 52 chars) in `PASETO_SESSION_KEY`.
Generate a dev-only key locally — never commit a real secret
(`.env.example` carries a placeholder; production uses its own key):

```bash
node --input-type=module -e \
  "import { LocalProtocol } from 'paseto'; \
   import { ExportKeyFactory, GenerateKeyFactory } from 'paseto/v3/local'; \
   const v3 = new LocalProtocol(GenerateKeyFactory, ExportKeyFactory); \
   v3.ExportKey(await v3.GenerateKey({ extractable: true })).then(console.log)"
```

Append the output to `.env` as `PASETO_SESSION_KEY="<output>"`. The server
fails fast at first login when the variable is missing or malformed.

## Login behavior (Phase 4)

- `POST /api/auth/login` accepts email + password for admin-provisioned
  accounts. Unknown email, wrong password, and inactive/suspended accounts
  all return the identical `401 {"error":"Invalid email or password."}`.
- Unverified emails are **not** blocked: login succeeds with
  `emailVerified: false` and the dashboard shows a verification notice.
- The session lives in an `HttpOnly` + `Secure` + `SameSite=Lax` cookie
  (`__Host-inspexo_session`, 8 h). `POST /api/auth/logout` revokes the
  server-side session and clears the cookie; `GET /api/auth/session`
  returns the current user or 401.
- Failed logins are throttled per email (5 per 15 min → `429`); a success
  resets the window.

## Bootstrapping the first admin (manual, one-time)

Single-admin system: the API rejects `role: "admin"`, so the first admin is
inserted directly. Never seed a known/shared password.

```bash
# 1. Generate an Argon2id hash for the admin's initial secret
node --input-type=module -e \
  "import { hash } from '@node-rs/argon2'; \
   hash('PASTE-STRONG-SECRET-HERE', { memoryCost: 19456, timeCost: 2, parallelism: 1 }).then(console.log)"
```

```sql
-- 2. Insert the admin (replace email/name/hash). It starts unverified and
-- must change its password at first login, like every provisioned account.
INSERT INTO public."user"
  (id, email, name, "passwordHash", role, status, "emailVerifiedAt", "mustChangePassword")
VALUES
  (gen_random_uuid(), 'admin@inspexo.id', 'Site Admin', '<PHC-HASH>', 'admin', 'active', NULL, TRUE);
```

## Seeding the four facilities (manual, one-time)

Sites are referenced by id at provisioning time; seed them before creating
site-scoped users. Codes are stable identifiers — do not rename them later.

```sql
INSERT INTO public.site (id, code, name) VALUES
  (gen_random_uuid(), 'plant-1', 'Plant 1'),
  (gen_random_uuid(), 'plant-2', 'Plant 2'),
  (gen_random_uuid(), 'plant-3', 'Plant 3'),
  (gen_random_uuid(), 'warehouse-1', 'Warehouse 1');
```

## Recovery caveat

If the single admin account is deactivated, no one can provision.
Recovery is direct database access only (`UPDATE public."user" SET status =
'active' …` or inserting a replacement admin per above). There is no
self-service recovery by design.

## Known open hole (until login lands)

`app/dashboard/users/actions.ts` (`createUser`/`updateUser`) writes users with
no caller check, a `"-"` password placeholder, and no site assignment. It is
deliberately untouched (owned by another person) and must delegate to
`provisionUser()` with a session-derived caller once login/PASETO exists.
Do not expose it beyond the local dev dashboard before then.

# Admin provisioning — operator runbook

Phase 3: users are created **only** via `provisionUser()` in
`src/lib/auth/provision.ts`. There is no public registration and no
`/register` endpoint. The caller must be an active `admin`; business roles
(`verificator`, `auditor`, `auditee`) can never provision.

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

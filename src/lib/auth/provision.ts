// Admin-only user provisioning. Server-only.
//
// THE provisioning entry point — the only code path that creates users.
// There is no public registration: no /register endpoint exists and this
// module always requires an active admin caller first.
//
// Created account state: email-unverified (emailVerifiedAt null),
// mustChangePassword true, role + sites assigned by the admin. A
// system-generated temporary password is Argon2id-hashed and returned ONCE
// in the result for out-of-band relay — the hash never leaves this module.

import { z } from "zod";
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "@/src/prisma/db";

import { requireAdmin } from "./authorize";
import { recordAudit } from "./audit";
import { ProvisionError } from "./errors";
import {
  ASSIGNABLE_ROLES,
  MAX_SITES,
  MIN_SITES,
  isAssignableRole,
  type AssignableRole,
} from "./roles";
import { generateTempPassword, hashPassword } from "./password";

const varchar = <N extends number>(value: string) => value as Varchar<N>;

export const provisionInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().toLowerCase().pipe(z.email().max(255)),
  role: z.enum(ASSIGNABLE_ROLES),
  siteIds: z.array(z.uuid()).default([]),
  status: z.enum(["active", "inactive", "suspended"]).default("active"),
  department: z.string().trim().max(128).optional(),
});

export type ProvisionInput = z.input<typeof provisionInputSchema>;

export type ProvisionedUser = {
  id: string;
  email: string;
  name: string;
  role: AssignableRole;
  status: string;
  department: string | null;
  siteIds: string[];
  mustChangePassword: boolean;
};

export type ProvisionResult = {
  user: ProvisionedUser;
  /** One-time secret for out-of-band relay. Never stored, never logged. */
  tempPassword: string;
};

export async function provisionUser(
  callerId: string | null,
  rawInput: unknown,
): Promise<ProvisionResult> {
  // 1. Authorization first — unauthenticated and non-admin never reach validation.
  await requireAdmin(callerId);

  // 2. Input validation.
  const parsed = provisionInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ProvisionError("INVALID_INPUT", "Invalid provisioning data.", parsed.error.flatten());
  }
  const input = parsed.data;

  // Defense in depth: the zod enum already excludes "admin", but if the role
  // set ever widens, assignment policy must fail closed, not open.
  if (!isAssignableRole(input.role)) {
    throw new ProvisionError("ROLE_NOT_ASSIGNABLE", `Role "${input.role}" cannot be assigned.`);
  }
  const role: AssignableRole = input.role;

  // 3. Site cardinality for the role (dedupe first: same site twice is one assignment).
  const siteIds = [...new Set(input.siteIds)];
  if (siteIds.length < MIN_SITES[role] || siteIds.length > MAX_SITES[role]) {
    throw new ProvisionError(
      "SITE_CARDINALITY",
      role === "auditee"
        ? "An auditee must be assigned exactly one site."
        : `Role "${role}" requires at least one site assignment.`,
      { role, siteIds },
    );
  }

  // 4. Duplicate email (input already lowercased; the lower(email) unique
  // index is the backstop against races).
  const existing = await db.orm.public.User.where({ email: varchar<255>(input.email) }).first();
  if (existing !== null) {
    throw new ProvisionError("DUPLICATE_EMAIL", "Email is already registered.");
  }

  // 5. Every site must exist.
  if (siteIds.length > 0) {
    const rows = await db.orm.public.Site.where((s) => s.id.in(siteIds)).all();
    if (rows.length !== siteIds.length) {
      const found = new Set(rows.map((r) => r.id));
      throw new ProvisionError(
        "UNKNOWN_SITE",
        "One or more assigned sites do not exist.",
        { unknownSiteIds: siteIds.filter((id) => !found.has(id)) },
      );
    }
  }

  // 6. Credential: system-generated, hashed, returned once.
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const credentialSetAt = Temporal.Now.instant();

  // 7. Atomic create: user + site assignments commit or roll back together.
  const userId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.orm.public.User.create({
      id: userId,
      email: varchar<255>(input.email),
      name: varchar<255>(input.name),
      passwordHash: varchar<255>(passwordHash),
      passwordSetAt: credentialSetAt,
      role,
      department: input.department ? varchar<128>(input.department) : null,
      status: input.status,
      emailVerifiedAt: null,
      mustChangePassword: true,
    });
    for (const siteId of siteIds) {
      await tx.orm.public.UserSite.create({ userId, siteId });
    }
  });
  await recordAudit("user.provisioned", callerId, userId);

  return {
    user: {
      id: userId,
      email: input.email,
      name: input.name,
      role,
      status: input.status,
      department: input.department ?? null,
      siteIds,
      mustChangePassword: true,
    },
    tempPassword,
  };
}

// Admin user management: role assignment, site assignment, activation.
// Server-only. Helpers only in this phase — no HTTP routes.
//
// Every operation requires an active admin caller FIRST (requireAdmin), then
// validates the target change. Single-admin guards: the admin can neither
// deactivate their own account nor move themselves off the admin role —
// either would orphan administration with direct-DB access as the only
// recovery. Role "admin" is never assignable (see provision.ts policy).
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

const roleSchema = z.enum(ASSIGNABLE_ROLES);
const statusSchema = z.enum(["active", "inactive", "suspended"]);
const siteIdsSchema = z.array(z.uuid());

const varchar = <N extends number>(value: string) => value as Varchar<N>;

async function requireTargetUser(userId: string): Promise<{ id: string; role: string }> {
  const target = await db.orm.public.User.where({ id: userId }).first();
  if (target === null) {
    throw new ProvisionError("USER_NOT_FOUND", "User does not exist.");
  }
  return { id: target.id, role: target.role };
}

async function assertSitesExist(siteIds: string[]): Promise<void> {
  if (siteIds.length === 0) return;
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

function assertCardinality(role: AssignableRole, siteIds: string[]): void {
  if (siteIds.length < MIN_SITES[role] || siteIds.length > MAX_SITES[role]) {
    throw new ProvisionError(
      "SITE_CARDINALITY",
      role === "auditee"
        ? "An auditee must be assigned exactly one site."
        : `Role "${role}" requires at least one site assignment.`,
      { role, siteIds },
    );
  }
}

/**
 * Change a user's role. The user's CURRENT site assignments must satisfy the
 * new role's cardinality — otherwise the admin fixes sites first (no silent
 * trimming, no violating rows).
 */
export async function updateUserRole(
  adminId: string | null,
  userId: string,
  rawRole: unknown,
): Promise<{ id: string; role: AssignableRole }> {
  const admin = await requireAdmin(adminId);
  if (admin.id === userId) {
    throw new ProvisionError("SELF_ROLE_CHANGE", "An admin cannot change their own role.");
  }
  const parsed = roleSchema.safeParse(rawRole);
  if (!parsed.success || !isAssignableRole(parsed.data)) {
    throw new ProvisionError("ROLE_NOT_ASSIGNABLE", "Role cannot be assigned.");
  }
  const role: AssignableRole = parsed.data;
  await requireTargetUser(userId);
  const assignments = await db.orm.public.UserSite.where({ userId }).all();
  assertCardinality(
    role,
    assignments.map((a) => a.siteId),
  );
  await db.orm.public.User.where({ id: userId }).update({ role });
  await recordAudit("user.role_changed", admin.id, userId);
  return { id: userId, role };
}

/**
 * Replace a user's site assignments wholesale (dedupe first). Admin accounts
 * hold zero sites by definition and cannot be given any.
 */
export async function updateUserSites(
  adminId: string | null,
  userId: string,
  rawSiteIds: unknown,
): Promise<{ id: string; siteIds: string[] }> {
  const admin = await requireAdmin(adminId);
  const target = await requireTargetUser(userId);  const parsed = siteIdsSchema.safeParse(rawSiteIds);
  if (!parsed.success) {
    throw new ProvisionError("INVALID_INPUT", "Invalid site assignment.", parsed.error.flatten());
  }
  const siteIds = [...new Set(parsed.data)];
  if (target.role === "admin") {
    if (siteIds.length > 0) {
      throw new ProvisionError(
        "SITE_CARDINALITY",
        "Admin accounts hold no site assignments.",
        { role: target.role, siteIds },
      );
    }
    return { id: userId, siteIds };
  }
  if (!isAssignableRole(target.role)) {
    throw new ProvisionError("ROLE_NOT_ASSIGNABLE", "Role cannot be assigned.");
  }
  assertCardinality(target.role, siteIds);
  await assertSitesExist(siteIds);
  await db.transaction(async (tx) => {
    const current = await tx.orm.public.UserSite.where({ userId }).all();
    for (const row of current) {
      await tx.orm.public.UserSite.where({ userId, siteId: row.siteId }).delete();
    }
    for (const siteId of siteIds) {
      await tx.orm.public.UserSite.create({ userId, siteId });
    }
  });
  await recordAudit("user.sites_changed", adminId, userId);
  return { id: userId, siteIds };
}

/**
 * Activate or deactivate a user. Deactivation revokes all of the user's
 * sessions in the same transaction, so access ends immediately — not on the
 * next request.
 */
export async function setUserStatus(
  adminId: string | null,
  userId: string,
  rawStatus: unknown,
): Promise<{ id: string; status: string }> {
  const admin = await requireAdmin(adminId);
  const parsed = statusSchema.safeParse(rawStatus);
  if (!parsed.success) {
    throw new ProvisionError("INVALID_INPUT", "Invalid account status.");
  }
  if (admin.id === userId && parsed.data !== "active") {
    throw new ProvisionError(
      "SELF_DEACTIVATION",
      "An admin cannot deactivate their own account.",
    );
  }
  await requireTargetUser(userId);
  await db.transaction(async (tx) => {
    await tx.orm.public.User.where({ id: userId }).update({ status: parsed.data });
    if (parsed.data !== "active") {
      const sessions = await tx.orm.public.Session.where({ userId }).all();
      const now = Temporal.Now.instant();
      for (const session of sessions) {
        if (session.revokedAt === null) {
          await tx.orm.public.Session.where({ id: session.id }).update({ revokedAt: now });
        }
      }
    }
  });
  await recordAudit("user.status_changed", admin.id, userId);
  return { id: userId, status: parsed.data };
}

const contactSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  email: z.string().trim().toLowerCase().pipe(z.email().max(255)).optional(),
});

/**
 * Change a user's name and/or email. An email change resets verification
 * (emailVerifiedAt → null) and kills live verification tokens — otherwise a
 * new, unverified address would inherit the old address's verified state.
 */
export async function updateUserContact(
  adminId: string | null,
  userId: string,
  rawContact: unknown,
): Promise<{ id: string; name: string; email: string; emailVerified: boolean }> {
  const admin = await requireAdmin(adminId);
  const parsed = contactSchema.safeParse(rawContact);
  if (!parsed.success || (parsed.data.name === undefined && parsed.data.email === undefined)) {
    throw new ProvisionError("INVALID_INPUT", "Invalid contact data.");
  }
  const target = await db.orm.public.User.where({ id: userId }).first();
  if (target === null) {
    throw new ProvisionError("USER_NOT_FOUND", "User does not exist.");
  }
  const name: string = parsed.data.name ?? target.name;
  let email: string = target.email;
  let emailVerified = target.emailVerifiedAt !== null;
  if (parsed.data.email !== undefined && parsed.data.email !== target.email) {
    const clash = await db.orm.public.User.where({
      email: varchar<255>(parsed.data.email),
    }).first();
    if (clash !== null) {
      throw new ProvisionError("DUPLICATE_EMAIL", "Email is already registered.");
    }
    email = parsed.data.email;
    emailVerified = false;
  }
  await db.transaction(async (tx) => {
    await tx.orm.public.User.where({ id: userId }).update({
      name: varchar<255>(name),
      email: varchar<255>(email),
      ...(emailVerified ? {} : { emailVerifiedAt: null }),
    });
    if (!emailVerified) {
      const live = await tx.orm.public.EmailVerificationToken.where({ userId }).all();
      const now = Temporal.Now.instant();
      for (const row of live) {
        if (row.usedAt === null) {
          await tx.orm.public.EmailVerificationToken.where({ id: row.id }).update({
            usedAt: now,
          });
        }
      }
    }
  });
  await recordAudit("user.contact_changed", admin.id, userId);
  return { id: userId, name, email, emailVerified };
}

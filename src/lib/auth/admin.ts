// Admin user management: role assignment, site assignment, activation.
// Server-only. Helpers only in this phase — no HTTP routes.
//
// Every operation requires an active admin caller FIRST (requireAdmin), then
// validates the target change. Single-admin guards: the admin can neither
// deactivate their own account nor move themselves off the admin role —
// either would orphan administration with direct-DB access as the only
// recovery. Role "admin" is never assignable (see provision.ts policy).
import { z } from "zod";

import { db } from "@/src/prisma/db";

import { requireAdmin } from "./authorize";
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
  await requireAdmin(adminId);
  const target = await requireTargetUser(userId);
  const parsed = siteIdsSchema.safeParse(rawSiteIds);
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
  return { id: userId, siteIds };
}

/**
 * Activate or deactivate a user. Deactivation takes effect on the next
 * request (sessions re-read the row); existing sessions are NOT revoked
 * here — revocation sweeps belong to a session-management pass.
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
  await db.orm.public.User.where({ id: userId }).update({ status: parsed.data });
  return { id: userId, status: parsed.data };
}

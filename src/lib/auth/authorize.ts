// Authorization gates. Server-only.
//
// Vocabulary (the contract future teams code against):
// - authentication = WHO this is (cookie → PASETO → DB user). Failures → 401.
// - authorization  = MAY they do this (role + site scope). Failures → 403.
// - role           = a data column on User, assigned by an admin, never by
//                    the user, never carried in the token.
// - permission     = a capability derived from role IN CODE (no permissions
//                    table — a DB edit must never grant unreviewed power).
//                    The HSE permission vocabulary itself is domain logic and
//                    lives with the domain, not here.
// - site scope     = UserSite join rows, the ONLY source of facility access.
//
// requireAdmin re-reads the caller row from the database on every call —
// never trusts a role string handed in from outside. A role change or
// deactivation takes effect on the very next call, with no token reissue.
//
// All gates throw; never return a boolean (callers must not branch around
// authorization with an `if` they can forget).

import { db } from "@/src/prisma/db";

import { AuthError, ProvisionError } from "./errors";
import { hasPermission, type Permission } from "./permissions";
import type { PublicUser } from "./session";

export type AdminCaller = {
  id: string;
  email: string;
  role: string;
  status: string;
};

export async function requireAdmin(callerId: string | null): Promise<AdminCaller> {
  if (callerId === null) {
    throw new ProvisionError("UNAUTHENTICATED", "Authentication required.");
  }
  const caller = await db.orm.public.User.where({ id: callerId }).first();
  if (caller === null) {
    // Indistinguishable from "no such caller": same code, same message.
    throw new ProvisionError("UNAUTHENTICATED", "Authentication required.");
  }
  if (caller.status !== "active") {
    throw new ProvisionError("ACCOUNT_DISABLED", "Account is disabled.");
  }
  if (caller.role !== "admin") {
    throw new ProvisionError("FORBIDDEN_NOT_ADMIN", "Admin privileges required.");
  }
  return { id: caller.id, email: caller.email, role: caller.role, status: caller.status };
}

/**
 * Require the user to hold one of the allowed roles. Role comes from the
 * already-loaded user (re-read from the DB at authentication time), never
 * from token claims. Single-admin note: "admin" is assignable here as a
 * value to check against — assignment policy lives in provision.ts.
 */
export function requireRole(user: PublicUser, ...allowed: string[]): PublicUser {
  if (!allowed.includes(user.role)) {
    throw new AuthError("FORBIDDEN_ROLE", "Insufficient role.");
  }
  return user;
}

/**
 * Require a UserSite row for (user, site). One indexed existence check for
 * every role — the auditee single-site restriction falls out of the data
 * (exactly one row exists) with no role branch in the path. Request-supplied
 * site IDs are never trusted: malformed IDs are denied without touching the
 * database, and only a matching row grants access, so forged or guessed
 * UUIDs are denied by the lookup itself.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function requireSiteAccess(user: PublicUser, siteId: string): Promise<PublicUser> {
  if (!UUID_RE.test(siteId)) {
    throw new AuthError("FORBIDDEN_SITE", "Site access denied.");
  }
  const assignment = await db.orm.public.UserSite.where({
    userId: user.id,
    siteId,
  }).first();
  if (assignment === null) {
    throw new AuthError("FORBIDDEN_SITE", "Site access denied.");
  }
  return user;
}

/**
 * Require a permission derived from the user's role (see permissions.ts).
 * Role comes from the already-loaded user, never from token claims or
 * request input — callers cannot bypass the check by calling lower layers
 * directly, because capability lives in this map, not in anything they send.
 */
export function requirePermission(user: PublicUser, permission: Permission): PublicUser {
  if (!hasPermission(user.role, permission)) {
    throw new AuthError("FORBIDDEN_PERMISSION", "Insufficient permission.");
  }
  return user;
}

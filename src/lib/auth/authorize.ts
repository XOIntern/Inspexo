// Authorization gate for admin provisioning. Server-only.
//
// requireAdmin re-reads the caller row from the database on every call —
// never trusts a role string handed in from outside. A role change or
// deactivation takes effect on the very next call, with no token reissue
// (there are no tokens yet; when sessions land, this same function guards
// the provisioning path with the session's user id).
//
// Throws ProvisionError; never returns a boolean (callers must not branch
// around authorization with an `if` they can forget).

import { db } from "@/src/prisma/db";

import { ProvisionError } from "./errors";

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

// Append-only audit trail for privileged actions. Server-only.
//
// Best-effort by design: an audit write failure must never break the
// operation it records (availability over completeness for the trail
// itself). Rows carry no foreign keys so they survive user deletion.
// Readers: future admin UI, incident response — never end users.
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "@/src/prisma/db";

const varchar = <N extends number>(value: string) => value as Varchar<N>;

export const AUDIT_ACTIONS = [
  "user.provisioned",
  "user.imported",
  "user.role_changed",
  "user.sites_changed",
  "user.status_changed",
  "user.contact_changed",
  "credentials.generated",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export async function recordAudit(
  action: AuditAction,
  actorId: string | null,
  targetUserId: string | null,
): Promise<void> {
  try {
    await db.orm.public.AuditLog.create({
      id: crypto.randomUUID(),
      actorId,
      action: varchar<64>(action),
      targetUserId,
    });
  } catch {
    // The trail must never break the operation. Gap accepted, documented.
  }
}

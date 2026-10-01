// Shared teardown helpers for auth integration tests. Targeted deletes
// only (never wipe shared tables — test files run in parallel workers).
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "@/src/prisma/db";

const varchar = <N extends number>(value: string) => value as Varchar<N>;

/** Delete audit rows touching any of the given user ids (actor or target). */
export async function cleanupAuditForUsers(userIds: string[]): Promise<void> {
  if (userIds.length === 0) return;
  for (const key of ["targetUserId", "actorId"] as const) {
    const rows = await db.orm.public.AuditLog.where((a) =>
      key === "targetUserId" ? a.targetUserId.in(userIds) : a.actorId.in(userIds),
    ).all();
    for (const row of rows) {
      await db.orm.public.AuditLog.where({ id: row.id }).delete();
    }
  }
}

/** Delete the given throttle rows when present. */
export async function cleanupThrottleKeys(keys: string[]): Promise<void> {
  for (const key of keys) {
    const row = await db.orm.public.AuthThrottle.where({ key: varchar<128>(key) }).first();
    if (row !== null) {
      await db.orm.public.AuthThrottle.where({ key: varchar<128>(key) }).delete();
    }
  }
}

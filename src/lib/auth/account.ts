// Self-service password change. Server-only.
//
// Requires a valid session (the caller is already authenticated, so a wrong
// current password gets a specific 401 — no oracle concern). On success the
// flag flips to false and every OTHER session is revoked: a password change
// is exactly when stale sessions must die. The current session is spared so
// the user is not logged out mid-flow.
import { z } from "zod";
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "@/src/prisma/db";

import { AuthError } from "./errors";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  hashPassword,
  verifyPassword,
} from "./password";

const varchar = <N extends number>(value: string) => value as Varchar<N>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
});

export async function changePassword(
  userId: string,
  sparedJti: string | null,
  rawInput: unknown,
): Promise<{ id: string }> {
  const parsed = changePasswordSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new AuthError("INVALID_CREDENTIALS", "Current password is incorrect.");
  }
  // Malformed shape and wrong secret share one response: the shape check
  // above already rejected empties, so this branch is unreachable for them.
  const row = await db.orm.public.User.where({ id: userId }).first();
  if (row === null || row.status !== "active") {
    throw new AuthError("SESSION_INVALID", "Authentication required.");
  }
  let currentOk = false;
  if (row.passwordHash) {
    try {
      currentOk = await verifyPassword(row.passwordHash, parsed.data.currentPassword);
    } catch {
      currentOk = false;
    }
  }
  if (!currentOk) {
    throw new AuthError("INVALID_CREDENTIALS", "Current password is incorrect.");
  }
  if (parsed.data.newPassword === parsed.data.currentPassword) {
    throw new AuthError("INVALID_CREDENTIALS", "New password must be different.");
  }
  const passwordHash = await hashPassword(parsed.data.newPassword);
  const now = Temporal.Now.instant();
  await db.transaction(async (tx) => {
    await tx.orm.public.User.where({ id: userId }).update({
      passwordHash: varchar<255>(passwordHash),
      passwordSetAt: now,
      mustChangePassword: false,
    });
    const sessions = await tx.orm.public.Session.where({ userId }).all();
    for (const session of sessions) {
      if (session.revokedAt === null && session.jti !== sparedJti) {
        await tx.orm.public.Session.where({ id: session.id }).update({ revokedAt: now });
      }
    }
  });
  return { id: userId };
}

// Self-service password reset. Server-only.
//
// Mirrors the email-verification mechanics (opaque random, hash-only
// storage, expiry, single-use, resend-supersedes) with two deliberate
// differences: a 1 h lifetime (this token guards a credential change, not
// mailbox proof) and full session revocation on success (a reset proves
// nothing about existing sessions — unlike change-password, there is no
// trusted current session to spare).
//
// Never PASETO: reset tokens are opaque, claimless, and single-purpose.
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "@/src/prisma/db";

import { VerificationError } from "./errors";
import { hashPassword, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./password";
import { checkThrottle, recordThrottleFailure, throttleKey } from "./throttle";
import { buildResetLink, generateRawToken, hashToken } from "./verification";

const varchar = <N extends number>(value: string) => value as Varchar<N>;

export const RESET_EXPIRY_HOURS = 1;
export const RESET_WINDOW_MS = 15 * 60 * 1000;
export const RESET_MAX_ATTEMPTS = 5;

export const GENERIC_RESET_MESSAGE = "Invalid or expired reset link.";

function resetKey(email: string): string {
  return `pwd-reset:${throttleKey(email)}`;
}

/**
 * Totally silent by design: existent or not, active or not, the caller gets
 * nothing back. Tokens are issued only for existing ACTIVE users (a
 * suspended account has no login to recover); everyone else costs one index
 * seek and no information.
 */
export async function requestPasswordReset(
  rawEmail: unknown,
  mailer: { sendPasswordResetEmail(to: string, link: string): Promise<unknown> },
  linkOrigin: string,
): Promise<void> {
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase().slice(0, 255) : "";
  const key = resetKey(email);
  try {
    await checkThrottle(key, { windowMs: RESET_WINDOW_MS, maxAttempts: RESET_MAX_ATTEMPTS });
  } catch {
    return;
  }
  await recordThrottleFailure(key, { windowMs: RESET_WINDOW_MS, maxAttempts: RESET_MAX_ATTEMPTS });

  const row =
    email.includes("@")
      ? await db.orm.public.User.where({ email: varchar<255>(email) }).first()
      : null;
  if (row === null || row.status !== "active") return;

  const rawToken = generateRawToken();
  const expiresAt = Temporal.Now.instant().add({ hours: RESET_EXPIRY_HOURS });
  await db.transaction(async (tx) => {
    const live = await tx.orm.public.PasswordResetToken.where((t) => t.userId.eq(row.id)).all();
    const now = Temporal.Now.instant();
    for (const token of live) {
      if (token.usedAt === null) {
        await tx.orm.public.PasswordResetToken.where({ id: token.id }).update({ usedAt: now });
      }
    }
    await tx.orm.public.PasswordResetToken.create({
      id: crypto.randomUUID(),
      userId: row.id,
      tokenHash: varchar<64>(hashToken(rawToken)),
      expiresAt,
    });
  });
  await mailer.sendPasswordResetEmail(row.email, buildResetLink(linkOrigin, rawToken));
}

/**
 * Redeem a reset token with a self-chosen secret. One transaction: mark
 * used, rehash, clear the must-change flag (the user chose this secret),
 * stamp the credential time, and revoke EVERY session — none is trusted.
 * Reuse, expiry, and garbage collapse to one generic 400.
 */
export async function confirmPasswordReset(
  rawToken: unknown,
  rawPassword: unknown,
): Promise<{ userId: string }> {
  if (typeof rawToken !== "string" || rawToken.length === 0 || rawToken.length > 256) {
    throw new VerificationError("INVALID_TOKEN", GENERIC_RESET_MESSAGE);
  }
  if (
    typeof rawPassword !== "string" ||
    rawPassword.length < PASSWORD_MIN_LENGTH ||
    rawPassword.length > PASSWORD_MAX_LENGTH
  ) {
    throw new VerificationError("INVALID_TOKEN", GENERIC_RESET_MESSAGE);
  }
  const row = await db.orm.public.PasswordResetToken.where({
    tokenHash: varchar<64>(hashToken(rawToken)),
  }).first();
  const now = Temporal.Now.instant();
  if (
    row === null ||
    row.usedAt !== null ||
    row.expiresAt.epochMilliseconds <= now.epochMilliseconds
  ) {
    throw new VerificationError("INVALID_TOKEN", GENERIC_RESET_MESSAGE);
  }
  const passwordHash = await hashPassword(rawPassword);
  await db.transaction(async (tx) => {
    await tx.orm.public.PasswordResetToken.where({ id: row.id }).update({ usedAt: now });
    await tx.orm.public.User.where({ id: row.userId }).update({
      passwordHash: varchar<255>(passwordHash),
      passwordSetAt: now,
      mustChangePassword: false,
    });
    const sessions = await tx.orm.public.Session.where({ userId: row.userId }).all();
    for (const session of sessions) {
      if (session.revokedAt === null) {
        await tx.orm.public.Session.where({ id: session.id }).update({ revokedAt: now });
      }
    }
  });
  return { userId: row.userId };
}

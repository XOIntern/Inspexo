// Email verification, separate from PASETO authentication. Server-only.
//
// Separation is structural, not conventional:
// - Verification tokens are opaque random with NO claims, in their own table,
//   with their own lifecycle. They are never accepted by readSessionToken,
//   and session tokens are never accepted here.
// - Consuming a token only flips User.emailVerifiedAt. Sessions carry
//   identity-only claims, so /me reflects verification with zero reissue.
//
// Storage: raw token (32 CSPRNG bytes → base64url) exists only in the link.
// The database holds SHA-256 hex only — the lookup IS the comparison
// (indexed seek; slow hashing would make this O(n) plus a CPU-burn vector).
// Raw tokens never reach responses, logs, or the database.
import { createHash, randomBytes } from "node:crypto";
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "@/src/prisma/db";

import { VerificationError } from "./errors";
import type { Mailer } from "./mailer";
import type { PublicUser } from "./session";
import { checkThrottle, recordThrottleFailure } from "./throttle";

const varchar = <N extends number>(value: string) => value as Varchar<N>;

export const VERIFICATION_TOKEN_BYTES = 32;
export const VERIFICATION_EXPIRY_HOURS = 24;
export const RESEND_WINDOW_MS = 15 * 60 * 1000;
export const RESEND_MAX_ATTEMPTS = 3;

/** Future page path for the link. No UI is built in this phase. */
export const VERIFY_PAGE_PATH = "/auth/verify-email";

export const GENERIC_VERIFICATION_MESSAGE = "Invalid or expired verification link.";

export function generateRawToken(): string {
  return randomBytes(VERIFICATION_TOKEN_BYTES).toString("base64url");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function buildVerificationLink(origin: string, rawToken: string): string {
  return `${origin.replace(/\/$/, "")}${VERIFY_PAGE_PATH}?token=${encodeURIComponent(rawToken)}`;
}

export type IssuedToken = {
  rawToken: string;
  expiresAt: Temporal.Instant;
};

function resendKey(userId: string): string {
  return `verify-resend:${userId}`;
}

/**
 * Issue a verification token, invalidating all live ones first (marked
 * used — history is kept, links die). Returns the RAW token for the link;
 * only the hash is stored.
 */
export async function issueVerificationToken(userId: string): Promise<IssuedToken> {
  const rawToken = generateRawToken();
  const expiresAt = Temporal.Now.instant().add({ hours: VERIFICATION_EXPIRY_HOURS });
  await db.transaction(async (tx) => {
    const live = await tx.orm.public.EmailVerificationToken.where((t) =>
      t.userId.eq(userId),
    ).all();
    const now = Temporal.Now.instant();
    for (const row of live) {
      if (row.usedAt === null) {
        await tx.orm.public.EmailVerificationToken.where({ id: row.id }).update({
          usedAt: now,
        });
      }
    }
    await tx.orm.public.EmailVerificationToken.create({
      id: crypto.randomUUID(),
      userId,
      tokenHash: varchar<64>(hashToken(rawToken)),
      expiresAt,
    });
  });
  return { rawToken, expiresAt };
}

/**
 * Redeem a token anonymously — no session required, so links work in any
 * browser. The token binds its own userId; it can only ever verify that one
 * account and can never authenticate as anyone. Garbage, expired, and used
 * tokens all collapse to one generic 400. Marking used and flipping
 * emailVerifiedAt commit atomically; the concurrent-double-click race is
 * benign (both writes converge on the same verified state).
 */
export async function consumeVerificationToken(rawToken: string): Promise<{ userId: string }> {
  if (typeof rawToken !== "string" || rawToken.length === 0 || rawToken.length > 256) {
    throw new VerificationError("INVALID_TOKEN", GENERIC_VERIFICATION_MESSAGE);
  }
  const row = await db.orm.public.EmailVerificationToken.where({
    tokenHash: varchar<64>(hashToken(rawToken)),
  }).first();
  const now = Temporal.Now.instant();
  if (
    row === null ||
    row.usedAt !== null ||
    row.expiresAt.epochMilliseconds <= now.epochMilliseconds
  ) {
    throw new VerificationError("INVALID_TOKEN", GENERIC_VERIFICATION_MESSAGE);
  }
  await db.transaction(async (tx) => {
    await tx.orm.public.EmailVerificationToken.where({ id: row.id }).update({ usedAt: now });
    await tx.orm.public.User.where({ id: row.userId }).update({ emailVerifiedAt: now });
  });
  return { userId: row.userId };
}

export type ResendResult =
  | { alreadyVerified: true; sent: false }
  | { alreadyVerified: false; sent: true };

/**
 * Resend for the caller's OWN account (the route authenticates first —
 * anonymous resend-by-email would be an enumeration oracle). Already
 * verified → idempotent success without issuing or sending. Otherwise
 * throttled (3/15 min), then issue + send. The raw token leaves only
 * inside the link passed to the mailer.
 */
export async function requestVerificationResend(
  user: PublicUser,
  mailer: Mailer,
  linkOrigin: string,
): Promise<ResendResult> {
  if (user.emailVerified) {
    return { alreadyVerified: true, sent: false };
  }
  const key = resendKey(user.id);
  try {
    await checkThrottle(key, { windowMs: RESEND_WINDOW_MS, maxAttempts: RESEND_MAX_ATTEMPTS });
  } catch {
    throw new VerificationError("RATE_LIMITED", "Too many attempts. Try again later.");
  }
  await recordThrottleFailure(key);
  const { rawToken } = await issueVerificationToken(user.id);
  await mailer.sendVerificationEmail({
    to: user.email,
    link: buildVerificationLink(linkOrigin, rawToken),
  });
  return { alreadyVerified: false, sent: true };
}

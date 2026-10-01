// DB-backed login rate limiter. Server-only.
//
// There is no Redis; an in-process Map stops throttling the moment two
// instances run. One row per email-hash works everywhere. Concurrent
// failures can lost-update the counter by one — acceptable for a throttle
// (fail-open by a single attempt, never fail-closed).

import { createHash } from "node:crypto";
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "@/src/prisma/db";

import { AuthError } from "./errors";

const varchar = <N extends number>(value: string) => value as Varchar<N>;

export const THROTTLE_WINDOW_MS = 15 * 60 * 1000;
export const THROTTLE_MAX_ATTEMPTS = 5;

export function throttleKey(email: string, clientIp: string | null = null): string {
  return createHash("sha256").update(`${email}|${clientIp ?? "direct"}`).digest("hex");
}

export type ThrottlePolicy = {
  windowMs: number;
  maxAttempts: number;
};

const DEFAULT_POLICY: ThrottlePolicy = {
  windowMs: THROTTLE_WINDOW_MS,
  maxAttempts: THROTTLE_MAX_ATTEMPTS,
};

function windowExpired(
  windowStartedAt: Temporal.Instant,
  now: Temporal.Instant,
  windowMs: number,
): boolean {
  return now.epochMilliseconds - windowStartedAt.epochMilliseconds >= windowMs;
}

/** Throws RATE_LIMITED when the key exhausted its window. */
export async function checkThrottle(key: string, policy: ThrottlePolicy = DEFAULT_POLICY): Promise<void> {
  const row = await db.orm.public.AuthThrottle.where({ key: varchar<128>(key) }).first();
  if (row === null) return;
  const now = Temporal.Now.instant();
  if (windowExpired(row.windowStartedAt, now, policy.windowMs)) {
    await db.orm.public.AuthThrottle.where({ key: varchar<128>(key) }).delete();
    return;
  }
  if (row.attempts >= policy.maxAttempts) {
    throw new AuthError("RATE_LIMITED", "Too many attempts. Try again later.");
  }
}

/** Records one failed attempt; resets the window when it expired. */
export async function recordThrottleFailure(
  key: string,
  policy: ThrottlePolicy = DEFAULT_POLICY,
): Promise<void> {
  const now = Temporal.Now.instant();
  const row = await db.orm.public.AuthThrottle.where({ key: varchar<128>(key) }).first();
  if (row === null || windowExpired(row.windowStartedAt, now, policy.windowMs)) {
    if (row !== null) {
      await db.orm.public.AuthThrottle.where({ key: varchar<128>(key) }).delete();
    }
    try {
      await db.orm.public.AuthThrottle.create({ key: varchar<128>(key), windowStartedAt: now, attempts: 1 });
    } catch (error) {
      // Lost a create race with a concurrent caller on the same key: fall
      // back to incrementing the row that won, instead of 500ing.
      const current = await db.orm.public.AuthThrottle.where({ key: varchar<128>(key) }).first();
      if (current === null) throw error;
      await db.orm.public.AuthThrottle.where({ key: varchar<128>(key) }).update({
        attempts: current.attempts + 1,
      });
    }
    return;
  }
  await db.orm.public.AuthThrottle.where({ key: varchar<128>(key) }).update({
    attempts: row.attempts + 1,
  });
}

/** Clears the key after a successful login. */
export async function clearThrottle(key: string): Promise<void> {
  const row = await db.orm.public.AuthThrottle.where({ key: varchar<128>(key) }).first();
  if (row !== null) {
    await db.orm.public.AuthThrottle.where({ key: varchar<128>(key) }).delete();
  }
}

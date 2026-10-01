// PASETO v3.local session management. Server-only.
//
// Design (Phase 1 decisions, verified against paseto@4.0.1):
// - Token FORMAT only: { sub: userId, jti, aud, iss } + 8 h expiry. No role,
//   department, or siteIds — authority is re-read from the DB per request.
// - Two expiry layers: PASETO exp AND the Session row (revokedAt IS NULL AND
//   expiresAt > now). Logout revokes the row; the token alone is not enough.
// - Cookie transport only (HttpOnly + Secure + SameSite=Lax, __Host- prefix).
//   The token never touches localStorage / JS.
// - Every decrypt/lookup failure collapses to one generic 401 — except a
//   deactivated account on a valid session (403, identity already proven).

import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { LocalProtocol } from "paseto";
import {
  DecryptFactory,
  EncryptFactory,
  ImportKeyFactory,
} from "paseto/v3/local";
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "@/src/prisma/db";

import { getSessionKeyPaserk } from "./env";
import { AuthError } from "./errors";
import { verifyDummy, verifyPassword, PASSWORD_MAX_LENGTH } from "./password";
import {
  checkThrottle,
  clearThrottle,
  recordThrottleFailure,
  throttleKey,
} from "./throttle";

const varchar = <N extends number>(value: string) => value as Varchar<N>;

export const SESSION_AUDIENCE = "inspexo";
export const SESSION_ISSUER = "inspexo";
export const SESSION_LIFETIME_SECONDS = 8 * 60 * 60;
export const SESSION_COOKIE_NAME = "__Host-inspexo_session";

export const GENERIC_CREDENTIALS_MESSAGE = "Invalid email or password.";
export const GENERIC_SESSION_MESSAGE = "Authentication required.";

async function buildSessionCrypto(paserk: string) {
  const protocol = new LocalProtocol(EncryptFactory, DecryptFactory, ImportKeyFactory);
  const key = await protocol.ImportKey(paserk as `k3.local.${string}`);
  return { protocol, key };
}

type SessionCrypto = Awaited<ReturnType<typeof buildSessionCrypto>>;

let cached: { paserk: string; crypto: SessionCrypto } | null = null;

async function getSessionCrypto(): Promise<SessionCrypto> {
  const paserk = getSessionKeyPaserk();
  if (cached === null || cached.paserk !== paserk) {
    cached = { paserk, crypto: await buildSessionCrypto(paserk) };
  }
  return cached.crypto;
}

/** Mint a token for an existing session row. */
export async function issueSessionToken(userId: string, jti: string): Promise<string> {
  const { protocol, key } = await getSessionCrypto();
  return protocol.Encrypt(
    key,
    { sub: userId, jti, aud: SESSION_AUDIENCE, iss: SESSION_ISSUER },
    { expiresIn: SESSION_LIFETIME_SECONDS },
  );
}

/** Decrypt and validate claims. Any failure → generic 401. */
export async function readSessionToken(token: string): Promise<{ userId: string; jti: string }> {
  try {
    const { protocol, key } = await getSessionCrypto();
    const { claims } = await protocol.Decrypt(key, token, {
      audience: SESSION_AUDIENCE,
      issuer: SESSION_ISSUER,
      maxTokenAge: SESSION_LIFETIME_SECONDS,
      requiredClaims: ["sub", "jti"],
    });
    const userId = (claims as Record<string, unknown>)["sub"];
    const jti = (claims as Record<string, unknown>)["jti"];
    if (typeof userId !== "string" || userId === "" || typeof jti !== "string" || jti === "") {
      throw new AuthError("SESSION_INVALID", GENERIC_SESSION_MESSAGE);
    }
    return { userId, jti };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError("SESSION_INVALID", GENERIC_SESSION_MESSAGE);
  }
}

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  department: string | null;
  emailVerified: boolean;
  mustChangePassword: boolean;
  siteIds: string[];
};

export async function toPublicUser(userId: string): Promise<PublicUser | null> {
  const row = await db.orm.public.User.where({ id: userId }).first();
  if (row === null) return null;
  const assignments = await db.orm.public.UserSite.where({ userId }).all();
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    department: row.department,
    emailVerified: row.emailVerifiedAt !== null,
    mustChangePassword: row.mustChangePassword,
    siteIds: assignments.map((a) => a.siteId),
  };
}

/**
 * Full session validation: token → row → user. Token/row problems → 401;
 * valid session on a deactivated account → 403.
 */
export async function validateSessionToken(token: string): Promise<PublicUser> {
  const { userId, jti } = await readSessionToken(token);
  const session = await db.orm.public.Session.where({
    jti: varchar<64>(jti),
  }).first();
  if (session === null || session.revokedAt !== null) {
    throw new AuthError("SESSION_INVALID", GENERIC_SESSION_MESSAGE);
  }
  const now = Temporal.Now.instant();
  if (session.expiresAt.epochMilliseconds <= now.epochMilliseconds) {
    throw new AuthError("SESSION_INVALID", GENERIC_SESSION_MESSAGE);
  }
  if (session.userId !== userId) {
    throw new AuthError("SESSION_INVALID", GENERIC_SESSION_MESSAGE);
  }
  const user = await toPublicUser(userId);
  if (user === null) {
    throw new AuthError("SESSION_INVALID", GENERIC_SESSION_MESSAGE);
  }
  if (user.status !== "active") {
    throw new AuthError("ACCOUNT_DISABLED", "Account is disabled.");
  }
  return user;
}

/** Create a session row + token. Best-effort prune of the user's expired rows. */
export async function createSession(userId: string): Promise<{ token: string; jti: string }> {
  const jti = randomBytes(32).toString("base64url");
  const expiresAt = Temporal.Now.instant().add({ hours: 8 });
  await db.orm.public.Session.create({
    id: crypto.randomUUID(),
    userId,
    jti: varchar<64>(jti),
    expiresAt,
  });
  try {
    const now = Temporal.Now.instant();
    const expired = await db.orm.public.Session.where((s) => s.userId.eq(userId)).all();
    for (const row of expired) {
      if (row.expiresAt.epochMilliseconds <= now.epochMilliseconds && row.jti !== jti) {
        await db.orm.public.Session.where({ jti: row.jti }).delete();
      }
    }
  } catch {
    // Pruning must never fail a login.
  }
  return { token: await issueSessionToken(userId, jti), jti };
}

/**
 * Authenticate by email + password. Unknown email, wrong password, null hash,
 * and inactive status ALL collapse to one generic 401 with comparable timing:
 * the miss path always runs a full Argon2id verify.
 */
export async function authenticate(rawEmail: unknown, rawPassword: unknown): Promise<PublicUser> {
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase().slice(0, 255) : "";
  const password = typeof rawPassword === "string" ? rawPassword : "";
  const key = throttleKey(email);
  await checkThrottle(key);

  const fail = async (): Promise<never> => {
    await recordThrottleFailure(key);
    throw new AuthError("INVALID_CREDENTIALS", GENERIC_CREDENTIALS_MESSAGE);
  };

  if (email === "" || !email.includes("@")) {
    // Shape-invalid input: same code and message, no timing oracle either
    // way (nothing here reveals whether an account exists).
    await recordThrottleFailure(key);
    throw new AuthError("INVALID_CREDENTIALS", GENERIC_CREDENTIALS_MESSAGE);
  }

  const row = await db.orm.public.User.where({ email: varchar<255>(email) }).first();

  let passwordOk = false;
  if (row?.passwordHash && password.length <= PASSWORD_MAX_LENGTH) {
    try {
      passwordOk = await verifyPassword(row.passwordHash, password);
    } catch {
      passwordOk = false;
    }
  } else {
    await verifyDummy(password);
  }
  if (!passwordOk || row === null || row.status !== "active") {
    return fail();
  }

  await clearThrottle(key);
  const user = await toPublicUser(row.id);
  if (user === null || user.status !== "active") {
    return fail();
  }
  return user;
}

/** Revoke the session behind a token. Never throws — logout is idempotent. */
export async function logoutToken(token: string | null): Promise<void> {
  if (token === null) return;
  try {
    const { jti } = await readSessionToken(token);
    const session = await db.orm.public.Session.where({
      jti: varchar<64>(jti),
    }).first();
    if (session !== null && session.revokedAt === null) {
      await db.orm.public.Session.where({ jti: session.jti }).update({
        revokedAt: Temporal.Now.instant(),
      });
    }
  } catch {
    // Undecryptable token: nothing to revoke. Cookie is still cleared by the route.
  }
}

// --- Cookie transport (NextRequest/NextResponse only — no next/headers, testable) ---

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_LIFETIME_SECONDS,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function getSessionCookie(req: NextRequest): string | null {
  return req.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/** Validate the session carried by a request. Used by protected APIs. */
export async function requireRequestUser(req: NextRequest): Promise<PublicUser> {
  const token = getSessionCookie(req);
  if (token === null) {
    throw new AuthError("SESSION_INVALID", GENERIC_SESSION_MESSAGE);
  }
  return validateSessionToken(token);
}

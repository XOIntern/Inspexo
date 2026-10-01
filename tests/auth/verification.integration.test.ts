// Integration tests for email verification against live Postgres.
// Every test cleans up the rows it creates. The real Resend API is never
// touched: services take a fake mailer, and the resend route's mailer module
// is mocked.
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "@/src/prisma/db";
import { cleanupThrottleKeys } from "./test-cleanup";
import { hashPassword } from "@/src/lib/auth/password";
import {
  SESSION_COOKIE_NAME,
  createSession,
  toPublicUser,
} from "@/src/lib/auth/session";
import { throttleKey } from "@/src/lib/auth/throttle";
import {
  consumeVerificationToken,
  hashToken,
  issueVerificationToken,
  requestVerificationResend,
} from "@/src/lib/auth/verification";
import type { Mailer } from "@/src/lib/auth/mailer";
import { POST as verifyPOST } from "@/app/api/auth/verify-email/route";
import { GET as meGET } from "@/app/api/auth/me/route";

const { POST: resendPOST } = await import("@/app/api/auth/resend-verification/route");

vi.mock("@/src/lib/auth/mailer", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/src/lib/auth/mailer")>();
  return {
    ...original,
    getMailer: () => ({
      sendVerificationEmail: async () => ({ id: "mocked-id" }),
    }),
  };
});

const varchar = <N extends number>(value: string) => value as Varchar<N>;
const ORIGIN = "http://localhost";

const createdUserIds: string[] = [];
const throttleKeys: string[] = [];

function fakeMailer(): Mailer & { sent: Array<{ to: string; link: string }> } {
  const sent: Array<{ to: string; link: string }> = [];
  return {
    sent,
    sendVerificationEmail: async (email) => {
      sent.push(email);
      return { id: "fake-id" };
    },
  };
}

async function makeUnverifiedUser(email: string, withPassword = false): Promise<string> {
  const id = crypto.randomUUID();
  await db.orm.public.User.create({
    id,
    email: varchar<255>(email),
    name: varchar<255>("Verify Test"),
    passwordHash: withPassword ? varchar<255>(await hashPassword("correct-horse-12")) : null,
    role: "auditee",
    status: "active",
    emailVerifiedAt: null,
    mustChangePassword: true,
  });
  createdUserIds.push(id);
  throttleKeys.push(throttleKey(email));
  throttleKeys.push(`verify-resend:${id}`);
  return id;
}

function authedPost(path: string, body: unknown, token: string | null): NextRequest {
  const headers: Record<string, string> = {
    origin: ORIGIN,
    "content-type": "application/json",
  };
  if (token !== null) headers["cookie"] = `${SESSION_COOKIE_NAME}=${token}`;
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

afterEach(async () => {
  for (const id of createdUserIds.splice(0)) {
    await db.orm.public.User.where({ id }).delete();
  }
  for (const key of throttleKeys.splice(0)) {
    const row = await db.orm.public.AuthThrottle.where({ key: varchar<128>(key) }).first();
    if (row !== null) await db.orm.public.AuthThrottle.where({ key: varchar<128>(key) }).delete();
  }
  // Verify-route calls without an X-Forwarded-For header share one key.
  await cleanupThrottleKeys([
    `verify-ip:${createHash("sha256").update("direct").digest("hex")}`,
  ]);
});

describe("issue and consume", () => {
  it("verifies an unverified user and marks the token used", async () => {
    const userId = await makeUnverifiedUser("v1-v@inspexo.id");
    const { rawToken } = await issueVerificationToken(userId);

    // Only the hash is stored — never the raw token.
    const rows = await db.orm.public.EmailVerificationToken.where({ userId }).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).toBe(hashToken(rawToken));
    expect(rows[0]!.tokenHash).not.toContain(rawToken.slice(0, 8));

    await expect(consumeVerificationToken(rawToken)).resolves.toEqual({ userId });

    const user = await db.orm.public.User.where({ id: userId }).first();
    expect(user?.emailVerifiedAt).not.toBeNull();
    const used = await db.orm.public.EmailVerificationToken.where({ userId }).first();
    expect(used?.usedAt).not.toBeNull();
  });

  it("rejects reuse, garbage, empty, and overlong tokens identically", async () => {
    const userId = await makeUnverifiedUser("v2-v@inspexo.id");
    const { rawToken } = await issueVerificationToken(userId);
    await consumeVerificationToken(rawToken);

    for (const bad of [rawToken, "garbage", "", "x".repeat(257)]) {
      await expect(consumeVerificationToken(bad)).rejects.toMatchObject({
        name: "VerificationError",
        code: "INVALID_TOKEN",
        status: 400,
      });
    }
  });

  it("rejects expired tokens", async () => {
    const userId = await makeUnverifiedUser("v3-v@inspexo.id");
    const rawToken = "expired-token-placeholder-0123456789";
    await db.orm.public.EmailVerificationToken.create({
      id: crypto.randomUUID(),
      userId,
      tokenHash: varchar<64>(hashToken(rawToken)),
      expiresAt: Temporal.Now.instant().add({ hours: -1 }),
    });
    await expect(consumeVerificationToken(rawToken)).rejects.toMatchObject({
      code: "INVALID_TOKEN",
    });
    const user = await db.orm.public.User.where({ id: userId }).first();
    expect(user?.emailVerifiedAt).toBeNull();
  });

  it("accepts a valid token for an already-verified user (idempotent)", async () => {
    const userId = await makeUnverifiedUser("v4-v@inspexo.id");
    const { rawToken } = await issueVerificationToken(userId);
    await consumeVerificationToken(rawToken);
    const { rawToken: second } = await issueVerificationToken(userId);
    await expect(consumeVerificationToken(second)).resolves.toEqual({ userId });
  });
});

describe("resend", () => {
  it("supersedes previous tokens and sends the new link only", async () => {
    const userId = await makeUnverifiedUser("r1-v@inspexo.id");
    const mailer = fakeMailer();
    const user = (await toPublicUser(userId))!;

    const first = await issueVerificationToken(userId);
    const result = await requestVerificationResend(user, mailer, ORIGIN);
    expect(result).toEqual({ alreadyVerified: false, sent: true });
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]!.to).toBe("r1-v@inspexo.id");
    const linkToken = new URL(mailer.sent[0]!.link).searchParams.get("token")!;

    // Old link is dead, new link works.
    await expect(consumeVerificationToken(first.rawToken)).rejects.toMatchObject({
      code: "INVALID_TOKEN",
    });
    await expect(consumeVerificationToken(linkToken)).resolves.toEqual({ userId });
  });

  it("throttles the 4th resend in 15 minutes", async () => {
    const userId = await makeUnverifiedUser("r2-v@inspexo.id");
    const user = (await toPublicUser(userId))!;
    for (let i = 0; i < 3; i++) {
      await requestVerificationResend(user, fakeMailer(), ORIGIN);
    }
    await expect(requestVerificationResend(user, fakeMailer(), ORIGIN)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
    });
  });

  it("already-verified users get success without issuing or sending", async () => {
    const userId = await makeUnverifiedUser("r3-v@inspexo.id");
    const { rawToken } = await issueVerificationToken(userId);
    await consumeVerificationToken(rawToken);
    const mailer = fakeMailer();
    const result = await requestVerificationResend((await toPublicUser(userId))!, mailer, ORIGIN);
    expect(result).toEqual({ alreadyVerified: true, sent: false });
    expect(mailer.sent).toHaveLength(0);
  });
});

describe("routes", () => {
  it("POST /verify-email redeems anonymously — no cookie needed", async () => {
    const userId = await makeUnverifiedUser("w1-v@inspexo.id");
    const { rawToken } = await issueVerificationToken(userId);

    const res = await verifyPOST(authedPost("/api/auth/verify-email", { token: rawToken }, null));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ verified: true });

    const bad = await verifyPOST(authedPost("/api/auth/verify-email", { token: "nope" }, null));
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: "Invalid or expired verification link." });

    const malformed = await verifyPOST(authedPost("/api/auth/verify-email", {}, null));
    expect(malformed.status).toBe(422);
  });

  it("POST /resend-verification requires a session and sends via mailer", async () => {
    const userId = await makeUnverifiedUser("w2-v@inspexo.id", true);
    const anon = await resendPOST(authedPost("/api/auth/resend-verification", {}, null));
    expect(anon.status).toBe(401);

    const { token } = await createSession(userId);
    const res = await resendPOST(authedPost("/api/auth/resend-verification", {}, token));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ verified: false, sent: true });
    expect(JSON.stringify(body)).not.toContain("token");
  });

  it("/me reflects verification immediately — no re-login", async () => {
    const userId = await makeUnverifiedUser("w3-v@inspexo.id", true);
    const { token } = await createSession(userId);
    const headers = { cookie: `${SESSION_COOKIE_NAME}=${token}` };

    const before = await (
      await meGET(new NextRequest("http://localhost/api/auth/me", { headers }))
    ).json();
    expect(before.user.emailVerified).toBe(false);

    const { rawToken } = await issueVerificationToken(userId);
    await consumeVerificationToken(rawToken);

    const after = await (
      await meGET(new NextRequest("http://localhost/api/auth/me", { headers }))
    ).json();
    expect(after.user.emailVerified).toBe(true);
  });
});

// Integration tests for forgot/reset password against live Postgres.
// The real Resend API is never touched: the mailer module is mocked and the
// captured link supplies raw tokens. Every test cleans up after itself.
import { verify } from "@node-rs/argon2";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "@/src/prisma/db";
import { hashPassword } from "@/src/lib/auth/password";
import { SESSION_COOKIE_NAME, createSession } from "@/src/lib/auth/session";
import { hashToken } from "@/src/lib/auth/verification";
import { throttleKey } from "@/src/lib/auth/throttle";
import { POST as forgotPOST } from "@/app/api/auth/forgot-password/route";
import { POST as resetPOST } from "@/app/api/auth/reset-password/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { GET as meGET } from "@/app/api/auth/me/route";
import { cleanupThrottleKeys } from "./test-cleanup";

const sentLinks: Array<{ to: string; link: string }> = [];

vi.mock("@/src/lib/auth/mailer", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/src/lib/auth/mailer")>();
  return {
    ...original,
    getMailer: () => ({
      sendVerificationEmail: async () => ({ id: "mocked-id" }),
      sendPasswordResetEmail: async (to: string, link: string) => {
        sentLinks.push({ to, link });
        return { id: "mocked-id" };
      },
    }),
  };
});

const varchar = <N extends number>(value: string) => value as Varchar<N>;
const ORIGIN = "http://localhost";

const createdUserIds: string[] = [];
const throttleKeys: string[] = [];

async function makeUser(email: string, status = "active"): Promise<string> {
  const id = crypto.randomUUID();
  await db.orm.public.User.create({
    id,
    email: varchar<255>(email),
    name: varchar<255>("Reset Test"),
    passwordHash: varchar<255>(await hashPassword("old-password-12")),
    role: "auditee",
    status,
  });
  createdUserIds.push(id);
  throttleKeys.push(`pwd-reset:${throttleKey(email)}`);
  return id;
}

function post(path: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function tokenFromLastLink(): string {
  const last = sentLinks[sentLinks.length - 1]!;
  return new URL(last.link).searchParams.get("token")!;
}

afterEach(async () => {
  sentLinks.length = 0;
  const userIds = createdUserIds.splice(0);
  for (const id of userIds) {
    await db.orm.public.User.where({ id }).delete();
  }
  await cleanupThrottleKeys(throttleKeys.splice(0));
  if (userIds.length > 0) {
    for (const rows of [
      await db.orm.public.PasswordResetToken.where((t) =>
        t.userId.in(userIds),
      ).all(),
    ]) {
      for (const row of rows) {
        await db.orm.public.PasswordResetToken.where({ id: row.id }).delete();
      }
    }
  }
});

describe("POST /api/auth/forgot-password", () => {
  it("always 202s, sending only for existing active users", async () => {
    await makeUser("fp-active@inspexo.id");
    await makeUser("fp-off@inspexo.id", "suspended");
    throttleKeys.push(`pwd-reset:${throttleKey("ghost@inspexo.id")}`);
    // Malformed bodies fail route validation, so the service throttles the
    // empty normalized string — track that key, not the literal.
    throttleKeys.push(`pwd-reset:${throttleKey("")}`);

    for (const email of ["fp-active@inspexo.id", "ghost@inspexo.id", "fp-off@inspexo.id", "not-an-email"]) {
      const res = await forgotPOST(post("/api/auth/forgot-password", { email }));
      expect(res.status).toBe(202);
      expect(await res.json()).toEqual({ sent: true });
    }
    expect(sentLinks).toHaveLength(1);
    expect(sentLinks[0]!.to).toBe("fp-active@inspexo.id");
    expect(sentLinks[0]!.link).toContain("/auth/reset-password?token=");
  });

  it("stays 202 even when throttled", async () => {
    await makeUser("fp-flood@inspexo.id");
    for (let i = 0; i < 7; i++) {
      const res = await forgotPOST(post("/api/auth/forgot-password", { email: "fp-flood@inspexo.id" }));
      expect(res.status).toBe(202);
    }
  });
});

describe("POST /api/auth/reset-password", () => {
  it("resets, revokes all sessions, and clears the flag", async () => {
    const userId = await makeUser("rp-ok@inspexo.id", "active");
    const { token: stale } = await createSession(userId);

    await forgotPOST(post("/api/auth/forgot-password", { email: "rp-ok@inspexo.id" }));
    const rawToken = tokenFromLastLink();

    // Hash-only storage.
    const stored = await db.orm.public.PasswordResetToken.where({ userId }).first();
    expect(stored!.tokenHash).toBe(hashToken(rawToken));

    const res = await resetPOST(post("/api/auth/reset-password", { token: rawToken, newPassword: "brand-new-pass-9" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reset: true });

    const row = await db.orm.public.User.where({ id: userId }).first();
    expect(row!.mustChangePassword).toBe(false);
    expect(row!.passwordSetAt).not.toBeNull();
    expect(await verify(row!.passwordHash as string, "brand-new-pass-9")).toBe(true);

    // Old session dead, new password works.
    const me = await meGET(
      new NextRequest("http://localhost/api/auth/me", {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${stale}` },
      }),
    );
    expect(me.status).toBe(401);
    const login = await loginPOST(
      post("/api/auth/login", { email: "rp-ok@inspexo.id", password: "brand-new-pass-9" }),
    );
    expect(login.status).toBe(200);
  });

  it("rejects reuse, garbage, expired, and weak passwords", async () => {
    await makeUser("rp-bad@inspexo.id", "active");
    await forgotPOST(post("/api/auth/forgot-password", { email: "rp-bad@inspexo.id" }));
    const rawToken = tokenFromLastLink();

    await resetPOST(post("/api/auth/reset-password", { token: rawToken, newPassword: "brand-new-pass-9" }));
    const reuse = await resetPOST(post("/api/auth/reset-password", { token: rawToken, newPassword: "another-new-pass-1" }));
    expect(reuse.status).toBe(400);

    const garbage = await resetPOST(post("/api/auth/reset-password", { token: "nope", newPassword: "another-new-pass-1" }));
    expect(garbage.status).toBe(400);
    expect(await garbage.json()).toEqual({ error: "Invalid or expired reset link." });

    const weak = await resetPOST(post("/api/auth/reset-password", { token: rawToken, newPassword: "short" }));
    expect(weak.status).toBe(422);

    const expiredRaw = "expired-reset-placeholder-0123456789";
    const userId = (await db.orm.public.User.where({ email: varchar<255>("rp-bad@inspexo.id") }).first())!.id;
    await db.orm.public.PasswordResetToken.create({
      id: crypto.randomUUID(),
      userId,
      tokenHash: varchar<64>(hashToken(expiredRaw)),
      expiresAt: Temporal.Now.instant().add({ hours: -1 }),
    });
    const expired = await resetPOST(
      post("/api/auth/reset-password", { token: expiredRaw, newPassword: "another-new-pass-1" }),
    );
    expect(expired.status).toBe(400);
  });
});

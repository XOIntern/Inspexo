// Integration tests for self-service password change and temporary
// credential expiry against live Postgres.
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "@/src/prisma/db";
import { hashPassword } from "@/src/lib/auth/password";
import { SESSION_COOKIE_NAME, createSession } from "@/src/lib/auth/session";
import { throttleKey } from "@/src/lib/auth/throttle";
import { POST as changePOST } from "@/app/api/auth/change-password/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";

const varchar = <N extends number>(value: string) => value as Varchar<N>;
const ORIGIN = "http://localhost";

const createdUserIds: string[] = [];
const throttleKeys: string[] = [];

async function makeUser(email: string, password: string, agedHours: number | null = null): Promise<string> {
  const id = crypto.randomUUID();
  await db.orm.public.User.create({
    id,
    email: varchar<255>(email),
    name: varchar<255>("Password Test"),
    passwordHash: varchar<255>(await hashPassword(password)),
    passwordSetAt: Temporal.Now.instant(),
    role: "auditee",
    status: "active",
    mustChangePassword: true,
  });
  if (agedHours !== null) {
    await db.orm.public.User.where({ id }).update({
      passwordSetAt: Temporal.Now.instant().add({ hours: -agedHours }),
    });
  }
  createdUserIds.push(id);
  throttleKeys.push(throttleKey(email));
  return id;
}

async function loginCookie(email: string, password: string): Promise<string> {
  const res = await loginPOST(
    new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  );
  expect(res.status).toBe(200);
  return res.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))!.split(";")[0]!;
}

function changeReq(cookie: string | null, body: unknown): NextRequest {
  const headers: Record<string, string> = {
    origin: ORIGIN,
    "content-type": "application/json",
  };
  if (cookie !== null) headers["cookie"] = cookie;
  return new NextRequest("http://localhost/api/auth/change-password", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

afterEach(async () => {
  const userIds = createdUserIds.splice(0);
  for (const id of userIds) {
    await db.orm.public.User.where({ id }).delete();
  }
  for (const key of throttleKeys.splice(0)) {
    const row = await db.orm.public.AuthThrottle.where({ key: varchar<128>(key) }).first();
    if (row !== null) await db.orm.public.AuthThrottle.where({ key: varchar<128>(key) }).delete();
  }
  if (userIds.length > 0) {
    const audits = await db.orm.public.AuditLog.where((a) => a.targetUserId.in(userIds)).all();
    for (const row of audits) {
      await db.orm.public.AuditLog.where({ id: row.id }).delete();
    }
    const actorAudits = await db.orm.public.AuditLog.where((a) => a.actorId.in(userIds)).all();
    for (const row of actorAudits) {
      await db.orm.public.AuditLog.where({ id: row.id }).delete();
    }
  }
});

describe("POST /api/auth/change-password", () => {
  it("rotates the secret, clears the flag, and revokes other sessions only", async () => {
    const userId = await makeUser("chg@inspexo.id", "old-password-12");
    const cookie = await loginCookie("chg@inspexo.id", "old-password-12");
    const { token: otherToken } = await createSession(userId);
    void otherToken;

    const res = await changePOST(
      changeReq(cookie, { currentPassword: "old-password-12", newPassword: "brand-new-pass-9" }),
    );
    expect(res.status).toBe(200);

    const row = await db.orm.public.User.where({ id: userId }).first();
    expect(row!.mustChangePassword).toBe(false);
    const sessions = await db.orm.public.Session.where({ userId }).all();
    const revoked = sessions.filter((s) => s.revokedAt !== null);
    const live = sessions.filter((s) => s.revokedAt === null);
    expect(revoked).toHaveLength(1);
    expect(live).toHaveLength(1);

    // Old password dead, new password works.
    expect(
      (await loginCookie("chg@inspexo.id", "brand-new-pass-9")).length,
    ).toBeGreaterThan(0);
    const badLogin = await loginPOST(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: { origin: ORIGIN, "content-type": "application/json" },
        body: JSON.stringify({ email: "chg@inspexo.id", password: "old-password-12" }),
      }),
    );
    expect(badLogin.status).toBe(401);
  });

  it("rejects wrong current password, reuse, weak input, and strangers", async () => {
    const userId = await makeUser("chg2@inspexo.id", "old-password-12");
    void userId;
    const cookie = await loginCookie("chg2@inspexo.id", "old-password-12");

    const wrong = await changePOST(changeReq(cookie, { currentPassword: "nope-nope-nope", newPassword: "brand-new-pass-9" }));
    expect(wrong.status).toBe(401);

    const reuse = await changePOST(changeReq(cookie, { currentPassword: "old-password-12", newPassword: "old-password-12" }));
    expect(reuse.status).toBe(401);

    const weak = await changePOST(changeReq(cookie, { currentPassword: "old-password-12", newPassword: "short" }));
    expect(weak.status).toBe(422);

    const anon = await changePOST(changeReq(null, { currentPassword: "x", newPassword: "brand-new-pass-9" }));
    expect(anon.status).toBe(401);
  });
});

describe("temporary credential expiry", () => {
  it("rejects unrotated 73-hour-old credentials with the generic 401", async () => {
    await makeUser("old-tmp@inspexo.id", "correct-horse-12", 73);
    const res = await loginPOST(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: { origin: ORIGIN, "content-type": "application/json" },
        body: JSON.stringify({ email: "old-tmp@inspexo.id", password: "correct-horse-12" }),
      }),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid email or password." });
  });

  it("accepts fresh temporary credentials and rotated old ones", async () => {
    await makeUser("fresh-tmp@inspexo.id", "correct-horse-12");
    const fresh = await loginPOST(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: { origin: ORIGIN, "content-type": "application/json" },
        body: JSON.stringify({ email: "fresh-tmp@inspexo.id", password: "correct-horse-12" }),
      }),
    );
    expect(fresh.status).toBe(200);
  });
});

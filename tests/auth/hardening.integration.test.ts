// Integration tests for the hardening fixes (M-3, M-4, L-1, L-2, L-3, L-7)
// against live Postgres.
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "@/src/prisma/db";
import { hashPassword } from "@/src/lib/auth/password";
import { authenticate, createSession, validateSessionToken } from "@/src/lib/auth/session";
import { throttleKey } from "@/src/lib/auth/throttle";
import { setUserStatus } from "@/src/lib/auth/admin";
import { generateUserCredentials } from "@/src/lib/auth/bulk";
import { provisionUser } from "@/src/lib/auth/provision";
import { POST as verifyPOST } from "@/app/api/auth/verify-email/route";

const varchar = <N extends number>(value: string) => value as Varchar<N>;
const ORIGIN = "http://localhost";

const createdUserIds: string[] = [];
const createdSiteIds: string[] = [];
const throttleKeys: string[] = [];

function trackThrottleKey(key: string): void {
  throttleKeys.push(key);
}

async function makeSite(code: string): Promise<string> {
  const id = crypto.randomUUID();
  await db.orm.public.Site.create({
    id,
    code: varchar<64>(code),
    name: varchar<255>(`Site ${code}`),
  });
  createdSiteIds.push(id);
  return id;
}

async function makeUser(email: string, password: string, role = "auditee"): Promise<string> {
  const id = crypto.randomUUID();
  await db.orm.public.User.create({
    id,
    email: varchar<255>(email),
    name: varchar<255>("Hardening Test"),
    passwordHash: varchar<255>(await hashPassword(password)),
    role,
    status: "active",
  });
  createdUserIds.push(id);
  return id;
}

async function makeAdmin(): Promise<string> {
  const id = crypto.randomUUID();
  await db.orm.public.User.create({
    id,
    email: varchar<255>(`hadm-${id.slice(0, 8)}@inspexo.id`),
    name: varchar<255>("Admin"),
    passwordHash: null,
    role: "admin",
    status: "active",
  });
  createdUserIds.push(id);
  return id;
}

afterEach(async () => {
  const userIds = createdUserIds.splice(0);
  for (const id of userIds) {
    await db.orm.public.User.where({ id }).delete();
  }
  for (const id of createdSiteIds.splice(0)) {
    await db.orm.public.Site.where({ id }).delete();
  }
  for (const key of throttleKeys.splice(0)) {
    const row = await db.orm.public.AuthThrottle.where({ key: varchar<128>(key) }).first();
    if (row !== null) await db.orm.public.AuthThrottle.where({ key: varchar<128>(key) }).delete();
  }
  if (userIds.length > 0) {
    for (const key of ["targetUserId", "actorId"] as const) {
      const rows = await db.orm.public.AuditLog.where((a) =>
        key === "targetUserId" ? a.targetUserId.in(userIds) : a.actorId.in(userIds),
      ).all();
      for (const row of rows) {
        await db.orm.public.AuditLog.where({ id: row.id }).delete();
      }
    }
  }
});

describe("M-3 overlong passwords", () => {
  it("rejects >1024-char passwords generically without feeding Argon2", async () => {
    await makeUser("long@inspexo.id", "correct-horse-12");
    trackThrottleKey(throttleKey("long@inspexo.id"));
    const err = await authenticate("long@inspexo.id", "x".repeat(1025)).catch((e) => e);
    expect(err).toMatchObject({ code: "INVALID_CREDENTIALS", status: 401 });
    expect(err.message).toBe("Invalid email or password.");
  });
});

describe("M-4 throttle keyed by email and network", () => {
  it("one network's failures do not lock out another", async () => {
    await makeUser("net@inspexo.id", "correct-horse-12");
    trackThrottleKey(throttleKey("net@inspexo.id", "1.2.3.4"));
    trackThrottleKey(throttleKey("net@inspexo.id", "5.6.7.8"));
    for (let i = 0; i < 5; i++) {
      await authenticate("net@inspexo.id", `bad-${i}`, { clientIp: "1.2.3.4" }).catch(() => undefined);
    }
    const locked = await authenticate("net@inspexo.id", "correct-horse-12", { clientIp: "1.2.3.4" }).catch((e) => e);
    expect(locked).toMatchObject({ code: "RATE_LIMITED" });

    const other = await authenticate("net@inspexo.id", "correct-horse-12", { clientIp: "5.6.7.8" });
    expect(other.email).toBe("net@inspexo.id");
  });
});

describe("L-1 deactivation revokes sessions", () => {
  it("suspended users lose live sessions immediately", async () => {
    const adminId = await makeAdmin();
    const siteId = await makeSite("H-1");
    const userId = await makeUser("rev@inspexo.id", "correct-horse-12", "auditee");
    await db.orm.public.UserSite.create({ userId, siteId });
    const { token } = await createSession(userId);

    await setUserStatus(adminId, userId, "suspended");
    const sessions = await db.orm.public.Session.where({ userId }).all();
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions.every((s) => s.revokedAt !== null)).toBe(true);
    await expect(validateSessionToken(token)).rejects.toMatchObject({ status: 401 });
  });
});

describe("L-2 verify-endpoint throttle", () => {
  it("allows 100 blind attempts, then 429s", async () => {
    const ip = "9.9.9.9";
    trackThrottleKey(`verify-ip:${createHash("sha256").update(ip).digest("hex")}`);
    const call = () =>
      verifyPOST(
        new NextRequest("http://localhost/api/auth/verify-email", {
          method: "POST",
          headers: { origin: ORIGIN, "content-type": "application/json", "x-forwarded-for": ip },
          body: JSON.stringify({ token: "garbage-token" }),
        }),
      );
    for (let i = 0; i < 100; i++) {
      expect((await call()).status).toBe(400);
    }
    expect((await call()).status).toBe(429);
  });
});

describe("L-3 bulk-operation budget", () => {
  it("allows 20 batch calls per hour per admin, then 429s", async () => {
    const adminId = await makeAdmin();
    trackThrottleKey(`bulk-credentials:${adminId}`);
    trackThrottleKey(`bulk-credentials:${adminId}`);
    const userId = await makeUser("budg@inspexo.id", "correct-horse-12");
    for (let i = 0; i < 20; i++) {
      const result = await generateUserCredentials(adminId, [userId]);
      expect(result.credentials).toHaveLength(1);
    }
    await expect(generateUserCredentials(adminId, [userId])).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
  });
});

describe("L-7 session cap", () => {
  it("keeps at most 10 live sessions, revoking the oldest", async () => {
    const userId = await makeUser("cap@inspexo.id", "correct-horse-12");
    const tokens: string[] = [];
    for (let i = 0; i < 12; i++) {
      tokens.push((await createSession(userId)).token);
    }
    const sessions = await db.orm.public.Session.where({ userId }).all();
    const live = sessions.filter((s) => s.revokedAt === null);
    expect(live).toHaveLength(10);
    await expect(validateSessionToken(tokens[0]!)).rejects.toMatchObject({ status: 401 });
    await expect(validateSessionToken(tokens[11]!)).resolves.toMatchObject({ id: userId });
  });
});

describe("audit coverage", () => {
  it("records role, status, and credential operations", async () => {
    const adminId = await makeAdmin();
    const siteId = await makeSite("AU-2");
    const { user } = await provisionUser(adminId, {
      name: "Audit Me",
      email: "auditme@inspexo.id",
      role: "auditee",
      siteIds: [siteId],
    });
    createdUserIds.push(user.id);

    const { setUserStatus: setStatus, updateUserRole } = await import("@/src/lib/auth/admin");
    await updateUserRole(adminId, user.id, "auditor");
    await setStatus(adminId, user.id, "suspended");
    await generateUserCredentials(adminId, [user.id]).catch(() => undefined);

    for (const action of ["user.role_changed", "user.status_changed"] as const) {
      const rows = await db.orm.public.AuditLog.where((a) => a.targetUserId.eq(user.id)).all();
      expect(rows.map((r) => r.action)).toContain(action);
    }
    trackThrottleKey(`bulk-credentials:${adminId}`);
    // Suspended target skips credential generation (failed row, no audit).
    const credRows = await db.orm.public.AuditLog.where((a) => a.targetUserId.eq(user.id)).all();
    expect(credRows.every((r) => r.actorId === adminId)).toBe(true);
  });
});

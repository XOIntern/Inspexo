// End-to-end flow tests: each journey walks the complete pipeline
// (provision → login → session → verify → authorize) in one test.
// Unit/integration files prove each stage in isolation; these prove the
// stages compose. A failure here is a finding, not a patch target.
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { LocalProtocol } from "paseto";
import { EncryptFactory, ImportKeyFactory } from "paseto/v3/local";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "@/src/prisma/db";
import { hashPassword } from "@/src/lib/auth/password";
import { SESSION_COOKIE_NAME } from "@/src/lib/auth/session";
import { requireRole, requireSiteAccess } from "@/src/lib/auth/authorize";
import { provisionUser } from "@/src/lib/auth/provision";
import { generateUserCredentials, importUsers } from "@/src/lib/auth/bulk";
import {
  consumeVerificationToken,
  issueVerificationToken,
} from "@/src/lib/auth/verification";
import { throttleKey } from "@/src/lib/auth/throttle";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { GET as meGET } from "@/app/api/auth/me/route";
import { GET as usersGET } from "@/app/api/admin/users/route";
import { POST as changePOST } from "@/app/api/auth/change-password/route";
import { cleanupAuditForUsers, cleanupThrottleKeys } from "./test-cleanup";

const varchar = <N extends number>(value: string) => value as Varchar<N>;
const ORIGIN = "http://localhost";

const createdUserIds: string[] = [];
const createdSiteIds: string[] = [];
const throttleKeys: string[] = [];

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

async function makeAdmin(email: string): Promise<string> {
  const id = crypto.randomUUID();
  await db.orm.public.User.create({
    id,
    email: varchar<255>(email),
    name: varchar<255>("Flow Admin"),
    passwordHash: varchar<255>(await hashPassword("admin-correct-12")),
    role: "admin",
    status: "active",
  });
  createdUserIds.push(id);
  return id;
}

function trackLogin(email: string): void {
  throttleKeys.push(throttleKey(email.trim().toLowerCase()));
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
  trackLogin(email);
  return res.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))!.split(";")[0]!;
}

function authedGet(path: string, cookie: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    headers: { cookie },
  });
}

beforeAll(() => {
  if (!process.env["PASETO_SESSION_KEY"]) {
    throw new Error("PASETO_SESSION_KEY must be set for auth tests (see .env).");
  }
});

afterEach(async () => {
  const userIds = createdUserIds.splice(0);
  for (const id of userIds) {
    await db.orm.public.User.where({ id }).delete();
  }
  for (const id of createdSiteIds.splice(0)) {
    await db.orm.public.Site.where({ id }).delete();
  }
  await cleanupThrottleKeys(throttleKeys.splice(0));
  await cleanupThrottleKeys([
    `verify-ip:${createHash("sha256").update("direct").digest("hex")}`,
  ]);
  await cleanupAuditForUsers(userIds);
});

describe("1. full journey: provision → login → verify → authorize", () => {
  it("walks the entire pipeline for an auditee", async () => {
    const adminId = await makeAdmin("j1-admin@inspexo.id");
    const home = await makeSite("J1-HOME");
    const away = await makeSite("J1-AWAY");

    // ADMIN creates user with a temporary credential.
    const { user, tempPassword } = await provisionUser(adminId, {
      name: "Journey Auditee",
      email: "j1-auditee@inspexo.id",
      role: "auditee",
      siteIds: [home],
    });
    createdUserIds.push(user.id);

    // User logs in, enters with an unverified email.
    const cookie = await loginCookie(user.email, tempPassword);
    const before = await (await meGET(authedGet("/api/auth/me", cookie))).json();
    expect(before.user).toMatchObject({ id: user.id, role: "auditee", emailVerified: false });

    // Anonymous link redemption verifies the mailbox.
    const { rawToken } = await issueVerificationToken(user.id);
    await consumeVerificationToken(rawToken);
    const after = await (await meGET(authedGet("/api/auth/me", cookie))).json();
    expect(after.user.emailVerified).toBe(true);

    // Authorization: own site granted, foreign site denied, role gates hold.
    await expect(requireSiteAccess(after.user, home)).resolves.toBe(after.user);
    await expect(requireSiteAccess(after.user, away)).rejects.toMatchObject({
      code: "FORBIDDEN_SITE",
    });
    expect(requireRole(after.user, "auditee")).toBe(after.user);
  });
});

describe("2. temporary credential lifecycle", () => {
  it("temp login → change password → rotation takes effect", async () => {
    const adminId = await makeAdmin("j2-admin@inspexo.id");
    const siteId = await makeSite("J2-HOME");
    const { user, tempPassword } = await provisionUser(adminId, {
      name: "Journey Rotate",
      email: "j2-auditee@inspexo.id",
      role: "auditee",
      siteIds: [siteId],
    });
    createdUserIds.push(user.id);

    const cookie = await loginCookie(user.email, tempPassword);
    const me = await (await meGET(authedGet("/api/auth/me", cookie))).json();
    expect(me.user.mustChangePassword).toBe(true);

    const changed = await changePOST(
      new NextRequest("http://localhost/api/auth/change-password", {
        method: "POST",
        headers: { origin: ORIGIN, "content-type": "application/json", cookie },
        body: JSON.stringify({ currentPassword: tempPassword, newPassword: "my-own-secret-1" }),
      }),
    );
    expect(changed.status).toBe(200);

    const relogin = await loginCookie(user.email, "my-own-secret-1");
    const meAgain = await (await meGET(authedGet("/api/auth/me", relogin))).json();
    expect(meAgain.user.mustChangePassword).toBe(false);

    const stale = await loginPOST(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: { origin: ORIGIN, "content-type": "application/json" },
        body: JSON.stringify({ email: user.email, password: tempPassword }),
      }),
    );
    expect(stale.status).toBe(401);
  });
});

describe("3. expired temporary credential", () => {
  it("rejects unrotated 73-hour-old credentials but honors rotated ones", async () => {
    const mk = async (email: string, rotated: boolean): Promise<string> => {
      const id = crypto.randomUUID();
      await db.orm.public.User.create({
        id,
        email: varchar<255>(email),
        name: varchar<255>("Journey Expiry"),
        passwordHash: varchar<255>(await hashPassword("correct-horse-12")),
        passwordSetAt: Temporal.Now.instant().add({ hours: -73 }),
        role: "auditee",
        status: "active",
        mustChangePassword: !rotated,
      });
      createdUserIds.push(id);
      trackLogin(email);
      return id;
    };
    await mk("j3-stale@inspexo.id", false);
    await mk("j3-rotated@inspexo.id", true);

    const attempt = (email: string) =>
      loginPOST(
        new NextRequest("http://localhost/api/auth/login", {
          method: "POST",
          headers: { origin: ORIGIN, "content-type": "application/json" },
          body: JSON.stringify({ email, password: "correct-horse-12" }),
        }),
      );

    const stale = await attempt("j3-stale@inspexo.id");
    expect(stale.status).toBe(401);
    expect(await stale.json()).toEqual({ error: "Invalid email or password." });

    expect((await attempt("j3-rotated@inspexo.id")).status).toBe(200);
  });
});

describe("4. deactivated admin mid-session", () => {
  it("loses admin API access with 403 on a live session", async () => {
    const adminId = await makeAdmin("j4-admin@inspexo.id");
    const cookie = await loginCookie("j4-admin@inspexo.id", "admin-correct-12");

    const before = await usersGET(authedGet("/api/admin/users", cookie));
    expect(before.status).toBe(200);

    await db.orm.public.User.where({ id: adminId }).update({ status: "suspended" });
    const after = await usersGET(authedGet("/api/admin/users", cookie));
    expect(after.status).toBe(403);
    expect(await after.json()).toEqual({ error: "Account is disabled.", code: "ACCOUNT_DISABLED" });
  });
});

describe("5. cryptographically expired token at route level", () => {
  it("rejects a PASETO past its exp with 401", async () => {
    const adminId = await makeAdmin("j5-admin@inspexo.id");
    const siteId = await makeSite("J5-HOME");
    const { user, tempPassword } = await provisionUser(adminId, {
      name: "Journey Expiry",
      email: "j5-auditee@inspexo.id",
      role: "auditee",
      siteIds: [siteId],
    });
    createdUserIds.push(user.id);
    const cookie = await loginCookie(user.email, tempPassword);
    expect((await meGET(authedGet("/api/auth/me", cookie))).status).toBe(200);

    const protocol = new LocalProtocol(EncryptFactory, ImportKeyFactory);
    const key = await protocol.ImportKey(
      process.env["PASETO_SESSION_KEY"] as `k3.local.${string}`,
    );
    const shortToken = await protocol.Encrypt(
      key,
      { sub: user.id, jti: crypto.randomUUID(), aud: "inspexo", iss: "inspexo" },
      { expiresIn: 1 },
    );
    await new Promise((r) => setTimeout(r, 1100));

    const res = await meGET(
      new NextRequest("http://localhost/api/auth/me", {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${shortToken}` },
      }),
    );
    expect(res.status).toBe(401);
  });
});

describe("6. Excel flow end to end", () => {
  it("imports, generates credentials, and logs in", async () => {
    const adminId = await makeAdmin("j6-admin@inspexo.id");
    throttleKeys.push(`bulk-import:${adminId}`, `bulk-credentials:${adminId}`);
    const siteId = await makeSite("J6-HOME");

    const imported = await importUsers(adminId, [
      { name: "Excel One", email: "j6-one@inspexo.id", role: "auditee", siteIds: [siteId] },
      { name: "Excel Two", email: "j6-two@inspexo.id", role: "auditor", siteIds: [siteId] },
    ]);
    expect(imported.failed).toEqual([]);
    for (const u of imported.created) createdUserIds.push(u.id);

    const nullHash = await db.orm.public.User.where({ id: imported.created[0]!.id }).first();
    expect(nullHash!.passwordHash).toBeNull();

    const batch = await generateUserCredentials(
      adminId,
      imported.created.map((u) => u.id),
    );
    expect(batch.failed).toEqual([]);
    expect(batch.credentials).toHaveLength(2);

    const cookie = await loginCookie("j6-one@inspexo.id", batch.credentials[0]!.tempPassword);
    const me = await (await meGET(authedGet("/api/auth/me", cookie))).json();
    expect(me.user).toMatchObject({ role: "auditee", siteIds: [siteId], emailVerified: false });
  });
});

describe("7. audit completeness across the flow", () => {
  it("records provision and credential events with the acting admin", async () => {
    const adminId = await makeAdmin("j7-admin@inspexo.id");
    throttleKeys.push(`bulk-credentials:${adminId}`);
    const siteId = await makeSite("J7-HOME");
    const { user } = await provisionUser(adminId, {
      name: "Journey Audit",
      email: "j7-auditee@inspexo.id",
      role: "auditee",
      siteIds: [siteId],
    });
    createdUserIds.push(user.id);
    await generateUserCredentials(adminId, [user.id]);

    const rows = await db.orm.public.AuditLog.where({ targetUserId: user.id }).all();
    const byAction = new Map<string, (typeof rows)[number]>(rows.map((r) => [r.action as string, r]));
    expect(byAction.has("user.provisioned")).toBe(true);
    expect(byAction.has("credentials.generated")).toBe(true);
    for (const row of rows) {
      expect(row.actorId).toBe(adminId);
    }
  });
});

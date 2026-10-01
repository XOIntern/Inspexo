// Integration tests for GET /api/auth/me and site-scope gates against live
// Postgres. Every test cleans up the rows it creates.
import { NextRequest } from "next/server";
import { describe, expect, it, afterEach } from "vitest";
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "@/src/prisma/db";
import { CURRENT_USER_KEYS } from "@/src/lib/auth/current-user";
import { requireSiteAccess } from "@/src/lib/auth/authorize";
import { hashPassword } from "@/src/lib/auth/password";
import { SESSION_COOKIE_NAME, toPublicUser } from "@/src/lib/auth/session";
import { throttleKey } from "@/src/lib/auth/throttle";
import { GET as meGET } from "@/app/api/auth/me/route";
import { GET as sessionGET } from "@/app/api/auth/session/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";

const varchar = <N extends number>(value: string) => value as Varchar<N>;

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

async function makeUser(email: string, role = "auditee"): Promise<string> {
  const id = crypto.randomUUID();
  await db.orm.public.User.create({
    id,
    email: varchar<255>(email),
    name: varchar<255>("Me Test"),
    passwordHash: varchar<255>(await hashPassword("correct-horse-12")),
    role,
    status: "active",
    emailVerifiedAt: Temporal.Now.instant().add({ minutes: 1 }),
    mustChangePassword: false,
  });
  createdUserIds.push(id);
  throttleKeys.push(throttleKey(email));
  return id;
}

function authedGet(path: string, token: string | null): NextRequest {
  const headers: Record<string, string> = {};
  if (token !== null) headers["cookie"] = `${SESSION_COOKIE_NAME}=${token}`;
  return new NextRequest(`http://localhost${path}`, { headers });
}

async function loginToken(email: string): Promise<string> {
  const res = await loginPOST(
    new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { origin: "http://localhost", "content-type": "application/json" },
      body: JSON.stringify({ email, password: "correct-horse-12" }),
    }),
  );
  expect(res.status).toBe(200);
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))!;
  return cookie.split(";")[0]!.split("=")[1]!;
}

afterEach(async () => {
  for (const id of createdUserIds.splice(0)) {
    await db.orm.public.User.where({ id }).delete();
  }
  for (const id of createdSiteIds.splice(0)) {
    await db.orm.public.Site.where({ id }).delete();
  }
  for (const key of throttleKeys.splice(0)) {
    const row = await db.orm.public.AuthThrottle.where({ key: varchar<128>(key) }).first();
    if (row !== null) await db.orm.public.AuthThrottle.where({ key: varchar<128>(key) }).delete();
  }
});

describe("GET /api/auth/me", () => {
  it("returns the exact safe key set for an authenticated user", async () => {
    const siteId = await makeSite("M-1");
    const userId = await makeUser("me-m@inspexo.id");
    await db.orm.public.UserSite.create({ userId, siteId });

    const res = await meGET(authedGet("/api/auth/me", await loginToken("me-m@inspexo.id")));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body.user).sort()).toEqual([...CURRENT_USER_KEYS].sort());
    expect(body.user).toMatchObject({ id: userId, siteIds: [siteId], emailVerified: true });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("$argon2");
    expect(serialized).not.toContain("passwordHash");
    expect(serialized).not.toContain("v3.local.");
  });

  it("is identical to /session for the same token", async () => {
    await makeUser("me-eq@inspexo.id");
    const token = await loginToken("me-eq@inspexo.id");
    const me = await (await meGET(authedGet("/api/auth/me", token))).json();
    const session = await (await sessionGET(authedGet("/api/auth/session", token))).json();
    expect(me).toEqual(session);
  });

  it.each([["missing", null], ["garbage", "not-a-token"]])(
    "401s on %s cookie and clears it",
    async (_label, token) => {
      const res = await meGET(authedGet("/api/auth/me", token));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Authentication required." });
      expect(
        res.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`)),
      ).toContain("Max-Age=0");
    },
  );

  it("403s a deactivated account on a valid session", async () => {
    const userId = await makeUser("me-deact@inspexo.id");
    const token = await loginToken("me-deact@inspexo.id");
    await db.orm.public.User.where({ id: userId }).update({ status: "inactive" });

    const res = await meGET(authedGet("/api/auth/me", token));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Account is disabled." });
  });
});

describe("requireSiteAccess", () => {
  it("allows assigned sites and denies the rest", async () => {
    const s1 = await makeSite("M-S1");
    const s2 = await makeSite("M-S2");
    const s3 = await makeSite("M-S3");
    const userId = await makeUser("sites-m@inspexo.id", "auditor");
    await db.orm.public.UserSite.create({ userId, siteId: s1 });
    await db.orm.public.UserSite.create({ userId, siteId: s2 });

    const user = (await toPublicUser(userId))!;
    await expect(requireSiteAccess(user, s1)).resolves.toMatchObject({ id: userId });
    await expect(requireSiteAccess(user, s2)).resolves.toMatchObject({ id: userId });
    await expect(requireSiteAccess(user, s3)).rejects.toMatchObject({
      code: "FORBIDDEN_SITE",
      status: 403,
    });
    await expect(requireSiteAccess(user, crypto.randomUUID())).rejects.toMatchObject({
      code: "FORBIDDEN_SITE",
    });
  });

  it("holds an auditee to its single site by data, not by branch", async () => {
    const home = await makeSite("M-HOME");
    const away = await makeSite("M-AWAY");
    const userId = await makeUser("auditee-m@inspexo.id", "auditee");
    await db.orm.public.UserSite.create({ userId, siteId: home });

    const user = (await toPublicUser(userId))!;
    await expect(requireSiteAccess(user, home)).resolves.toBe(user);
    await expect(requireSiteAccess(user, away)).rejects.toMatchObject({ status: 403 });
  });
});

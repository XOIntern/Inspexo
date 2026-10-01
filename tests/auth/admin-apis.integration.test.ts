// Integration tests for the admin API plane against live Postgres.
// Every route is exercised through real HTTP-shaped requests with login
// cookies. Denial tests assert database state, not just status codes.
import { verify } from "@node-rs/argon2";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "@/src/prisma/db";
import { hashPassword } from "@/src/lib/auth/password";
import { SESSION_COOKIE_NAME } from "@/src/lib/auth/session";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import {
  GET as usersGET,
  POST as usersPOST,
} from "@/app/api/admin/users/route";
import { GET as userGET } from "@/app/api/admin/users/[id]/route";
import { PATCH as rolePATCH } from "@/app/api/admin/users/[id]/role/route";
import { PUT as sitesPUT } from "@/app/api/admin/users/[id]/sites/route";
import { PATCH as statusPATCH } from "@/app/api/admin/users/[id]/status/route";
import { POST as importPOST } from "@/app/api/admin/users/import/route";
import { POST as credentialsPOST } from "@/app/api/admin/users/credentials/route";
import { GET as sitesGET } from "@/app/api/admin/sites/route";

const varchar = <N extends number>(value: string) => value as Varchar<N>;
const ORIGIN = "http://localhost";
const ADMIN_PASSWORD = "admin-correct-12";

const createdUserIds: string[] = [];
const createdSiteIds: string[] = [];

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

async function makeUser(email: string, role: string, status = "active"): Promise<string> {
  const id = crypto.randomUUID();
  await db.orm.public.User.create({
    id,
    email: varchar<255>(email),
    name: varchar<255>("Admin API Test"),
    passwordHash: varchar<255>(await hashPassword("user-correct-12")),
    role,
    status,
  });
  createdUserIds.push(id);
  return id;
}

async function makeAdmin(): Promise<{ id: string; cookie: string }> {
  const id = crypto.randomUUID();
  await db.orm.public.User.create({
    id,
    email: varchar<255>(`admin-${id.slice(0, 8)}@inspexo.id`),
    name: varchar<255>("Admin"),
    passwordHash: varchar<255>(await hashPassword(ADMIN_PASSWORD)),
    role: "admin",
    status: "active",
  });
  createdUserIds.push(id);
  const res = await loginPOST(
    new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ email: (await db.orm.public.User.where({ id }).first())!.email, password: ADMIN_PASSWORD }),
    }),
  );
  expect(res.status).toBe(200);
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))!;
  return { id, cookie: cookie.split(";")[0]! };
}

function req(
  method: string,
  path: string,
  cookie: string | null,
  body?: unknown,
  query = "",
): NextRequest {
  const headers: Record<string, string> = {};
  if (cookie !== null) headers["cookie"] = cookie;
  if (method !== "GET") {
    headers["origin"] = ORIGIN;
    headers["content-type"] = "application/json";
  }
  return new NextRequest(`http://localhost${path}${query}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function noSecrets(body: unknown): Promise<void> {
  const serialized = JSON.stringify(body);
  expect(serialized).not.toContain("$argon2");
  expect(serialized).not.toContain("passwordHash");
  expect(serialized).not.toContain("v3.local.");
}

afterEach(async () => {
  for (const id of createdUserIds.splice(0)) {
    await db.orm.public.User.where({ id }).delete();
  }
  for (const id of createdSiteIds.splice(0)) {
    await db.orm.public.Site.where({ id }).delete();
  }
});

describe("route guards", () => {
  it("401s without a cookie on every admin route", async () => {
    const id = crypto.randomUUID();
    const calls = [
      usersGET(req("GET", "/api/admin/users", null)),
      usersPOST(req("POST", "/api/admin/users", null, {})),
      userGET(req("GET", `/api/admin/users/${id}`, null), { params: Promise.resolve({ id }) }),
      rolePATCH(req("PATCH", `/api/admin/users/${id}/role`, null, {}), { params: Promise.resolve({ id }) }),
      sitesPUT(req("PUT", `/api/admin/users/${id}/sites`, null, {}), { params: Promise.resolve({ id }) }),
      statusPATCH(req("PATCH", `/api/admin/users/${id}/status`, null, {}), { params: Promise.resolve({ id }) }),
      importPOST(req("POST", "/api/admin/users/import", null, {})),
      credentialsPOST(req("POST", "/api/admin/users/credentials", null, {})),
      sitesGET(req("GET", "/api/admin/sites", null)),
    ];
    for (const call of calls) {
      expect((await call).status).toBe(401);
    }
  });

  it("403s non-admin callers on every admin route", async () => {
    const { cookie: adminCookie } = await makeAdmin();
    void adminCookie;
    const auditorId = await makeUser("guard-aud@inspexo.id", "auditor");
    const siteId = await makeSite("G-1");
    await db.orm.public.UserSite.create({ userId: auditorId, siteId });
    const login = await loginPOST(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: { origin: ORIGIN, "content-type": "application/json" },
        body: JSON.stringify({ email: "guard-aud@inspexo.id", password: "user-correct-12" }),
      }),
    );
    const cookie = login.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))!.split(";")[0]!;
    const id = crypto.randomUUID();
    const calls = [
      usersGET(req("GET", "/api/admin/users", cookie)),
      usersPOST(req("POST", "/api/admin/users", cookie, {})),
      userGET(req("GET", `/api/admin/users/${id}`, cookie), { params: Promise.resolve({ id }) }),
      rolePATCH(req("PATCH", `/api/admin/users/${id}/role`, cookie, {}), { params: Promise.resolve({ id }) }),
      sitesPUT(req("PUT", `/api/admin/users/${id}/sites`, cookie, {}), { params: Promise.resolve({ id }) }),
      statusPATCH(req("PATCH", `/api/admin/users/${id}/status`, cookie, {}), { params: Promise.resolve({ id }) }),
      importPOST(req("POST", "/api/admin/users/import", cookie, {})),
      credentialsPOST(req("POST", "/api/admin/users/credentials", cookie, {})),
      sitesGET(req("GET", "/api/admin/sites", cookie)),
    ];
    for (const call of calls) {
      expect((await call).status).toBe(403);
    }
    // The auditor's own assignments are untouched by the denied writes.
    const rows = await db.orm.public.UserSite.where({ userId: auditorId }).all();
    expect(rows.map((r) => r.siteId)).toEqual([siteId]);
  });
});

describe("GET /api/admin/users", () => {
  it("paginates, searches, and filters", async () => {
    const { cookie } = await makeAdmin();
    const s1 = await makeSite("L-1");
    const s2 = await makeSite("L-2");
    const a = await makeUser("rina.l@inspexo.id", "auditor");
    const b = await makeUser("budi.l@inspexo.id", "auditee", "inactive");
    const c = await makeUser("sari.l@inspexo.id", "verificator");
    await db.orm.public.UserSite.create({ userId: a, siteId: s1 });
    await db.orm.public.UserSite.create({ userId: b, siteId: s2 });
    await db.orm.public.UserSite.create({ userId: c, siteId: s1 });

    const page1 = await (await usersGET(req("GET", "/api/admin/users", cookie, undefined, "?pageSize=2"))).json();
    expect(page1.total).toBeGreaterThanOrEqual(4);
    expect(page1.users).toHaveLength(2);
    expect(page1.page).toBe(1);
    const page2 = await (await usersGET(req("GET", "/api/admin/users", cookie, undefined, "?pageSize=2&page=2"))).json();
    expect(page2.users).toHaveLength(2);
    expect(page2.users[0].id).not.toBe(page1.users[0].id);

    const search = await (await usersGET(req("GET", "/api/admin/users", cookie, undefined, "?search=RINA"))).json();
    expect(search.users.map((u: { email: string }) => u.email)).toContain("rina.l@inspexo.id");

    const role = await (await usersGET(req("GET", "/api/admin/users", cookie, undefined, "?role=auditee"))).json();
    expect(role.users.every((u: { role: string }) => u.role === "auditee")).toBe(true);

    const status = await (await usersGET(req("GET", "/api/admin/users", cookie, undefined, "?status=inactive"))).json();
    expect(status.users.map((u: { email: string }) => u.email)).toContain("budi.l@inspexo.id");

    const site = await (await usersGET(req("GET", "/api/admin/users", cookie, undefined, `?siteId=${s2}`))).json();
    expect(site.users.map((u: { email: string }) => u.email)).toEqual(["budi.l@inspexo.id"]);

    await noSecrets(page1);
  });

  it("rejects invalid filters", async () => {
    const { cookie } = await makeAdmin();
    expect((await usersGET(req("GET", "/api/admin/users", cookie, undefined, "?role=boss"))).status).toBe(422);
    expect((await usersGET(req("GET", "/api/admin/users", cookie, undefined, "?status=odd"))).status).toBe(422);
    expect((await usersGET(req("GET", "/api/admin/users", cookie, undefined, "?siteId=nope"))).status).toBe(422);
    expect((await usersGET(req("GET", "/api/admin/users", cookie, undefined, "?page=abc"))).status).toBe(422);
  });
});

describe("GET /api/admin/users/[id]", () => {
  it("returns details with sites and verification flags", async () => {
    const { cookie } = await makeAdmin();
    const siteId = await makeSite("D-1");
    const userId = await makeUser("det@inspexo.id", "auditor");
    await db.orm.public.UserSite.create({ userId, siteId });

    const res = await userGET(req("GET", `/api/admin/users/${userId}`, cookie), {
      params: Promise.resolve({ id: userId }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toMatchObject({ id: userId, role: "auditor", emailVerified: false });
    expect(body.user.sites).toEqual([{ id: siteId, code: "D-1", name: "Site D-1" }]);
    await noSecrets(body);
  });

  it("404s unknown and 422s malformed ids", async () => {
    const { cookie } = await makeAdmin();
    const missing = crypto.randomUUID();
    const res404 = await userGET(req("GET", `/api/admin/users/${missing}`, cookie), {
      params: Promise.resolve({ id: missing }),
    });
    expect(res404.status).toBe(404);
    const res422 = await userGET(req("GET", "/api/admin/users/nope", cookie), {
      params: Promise.resolve({ id: "nope" }),
    });
    expect(res422.status).toBe(422);
  });
});

describe("mutations", () => {
  it("provisions (201), patches role/sites/status, and enforces guards", async () => {
    const { cookie, id: adminId } = await makeAdmin();
    const siteId = await makeSite("M-1");
    const other = await makeSite("M-2");

    const created = await usersPOST(
      req("POST", "/api/admin/users", cookie, {
        name: "New Hire",
        email: "hire@inspexo.id",
        role: "auditee",
        siteIds: [siteId],
      }),
    );
    expect(created.status).toBe(201);
    const createdBody = await created.json();
    expect(createdBody.tempPassword).toHaveLength(20);
    const userId = createdBody.user.id as string;
    createdUserIds.push(userId);

    const dup = await usersPOST(
      req("POST", "/api/admin/users", cookie, {
        name: "Copy",
        email: "HIRE@inspexo.id",
        role: "auditee",
        siteIds: [siteId],
      }),
    );
    expect(dup.status).toBe(409);

    const roleOk = await rolePATCH(
      req("PATCH", `/api/admin/users/${userId}/role`, cookie, { role: "auditor" }),
      { params: Promise.resolve({ id: userId }) },
    );
    expect(roleOk.status).toBe(200);

    const roleBad = await rolePATCH(
      req("PATCH", `/api/admin/users/${userId}/role`, cookie, { role: "admin" }),
      { params: Promise.resolve({ id: userId }) },
    );
    expect(roleBad.status).toBe(422);

    const sitesOk = await sitesPUT(
      req("PUT", `/api/admin/users/${userId}/sites`, cookie, { siteIds: [siteId, other] }),
      { params: Promise.resolve({ id: userId }) },
    );
    expect(sitesOk.status).toBe(200);
    expect(((await sitesOk.json()) as { siteIds: string[] }).siteIds.sort()).toEqual(
      [siteId, other].sort(),
    );

    const sitesBad = await sitesPUT(
      req("PUT", `/api/admin/users/${userId}/sites`, cookie, { siteIds: [crypto.randomUUID()] }),
      { params: Promise.resolve({ id: userId }) },
    );
    expect(sitesBad.status).toBe(422);

    const suspended = await statusPATCH(
      req("PATCH", `/api/admin/users/${userId}/status`, cookie, { status: "suspended" }),
      { params: Promise.resolve({ id: userId }) },
    );
    expect(suspended.status).toBe(200);

    const selfOff = await statusPATCH(
      req("PATCH", `/api/admin/users/${adminId}/status`, cookie, { status: "inactive" }),
      { params: Promise.resolve({ id: adminId }) },
    );
    expect(selfOff.status).toBe(422);
    const admin = await db.orm.public.User.where({ id: adminId }).first();
    expect(admin!.status).toBe("active");
  });
});

describe("bulk import and credentials", () => {
  it("imports mixed rows with a per-row envelope and null hashes", async () => {
    const { cookie } = await makeAdmin();
    const siteId = await makeSite("B-1");

    const res = await importPOST(
      req("POST", "/api/admin/users/import", cookie, {
        users: [
          { name: "Bulk One", email: "bulk1@inspexo.id", role: "auditee", siteIds: [siteId] },
          { name: "Bulk Two", email: "bulk2@inspexo.id", role: "auditor", siteIds: [siteId] },
          { name: "Dup In File", email: "BULK1@inspexo.id", role: "auditee", siteIds: [siteId] },
          { name: "Bad Email", email: "nope", role: "auditee", siteIds: [siteId] },
          { name: "Bad Site", email: "badsite@inspexo.id", role: "auditee", siteIds: [crypto.randomUUID()] },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      created: Array<{ id: string; email: string }>;
      failed: Array<{ index: number; email: string | null; code: string }>;
    };
    expect(body.created.map((u) => u.email).sort()).toEqual(["bulk1@inspexo.id", "bulk2@inspexo.id"]);
    expect(body.failed).toEqual([
      { index: 2, email: "bulk1@inspexo.id", code: "DUPLICATE_EMAIL" },
      { index: 3, email: null, code: "INVALID_INPUT" },
      { index: 4, email: "badsite@inspexo.id", code: "UNKNOWN_SITE" },
    ]);
    for (const u of body.created) createdUserIds.push(u.id);
    await noSecrets(body);

    // Credential-less: null hashes stored.
    for (const u of body.created) {
      const row = await db.orm.public.User.where({ id: u.id }).first();
      expect(row!.passwordHash).toBeNull();
    }

    const notArray = await importPOST(req("POST", "/api/admin/users/import", cookie, { users: "x" }));
    expect(notArray.status).toBe(422);
  });

  it("generates credentials in one batch, usable at login, never stored", async () => {
    const { cookie } = await makeAdmin();
    const siteId = await makeSite("B-2");
    const u1 = await makeUser("cred1@inspexo.id", "auditee");
    const u2 = await makeUser("cred2@inspexo.id", "auditor");
    const off = await makeUser("credoff@inspexo.id", "auditee", "inactive");
    await db.orm.public.UserSite.create({ userId: u1, siteId });
    await db.orm.public.UserSite.create({ userId: u2, siteId });

    const res = await credentialsPOST(
      req("POST", "/api/admin/users/credentials", cookie, { userIds: [u1, u2, off, crypto.randomUUID()] }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      credentials: Array<{ userId: string; email: string; tempPassword: string }>;
      failed: Array<{ userId: string; code: string }>;
    };
    expect(body.credentials).toHaveLength(2);
    expect(body.failed.map((f) => f.code).sort()).toEqual(["ACCOUNT_DISABLED", "USER_NOT_FOUND"]);

    // Stored hashes verify; plaintext appears nowhere else.
    for (const c of body.credentials) {
      const row = await db.orm.public.User.where({ id: c.userId }).first();
      expect(row!.passwordHash).not.toBe(c.tempPassword);
      expect(await verify(row!.passwordHash as string, c.tempPassword)).toBe(true);
      expect(row!.mustChangePassword).toBe(true);
    }
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("$argon2");

    // A generated credential actually logs in.
    const login = await loginPOST(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: { origin: ORIGIN, "content-type": "application/json" },
        body: JSON.stringify({ email: "cred1@inspexo.id", password: body.credentials[0]!.tempPassword }),
      }),
    );
    expect(login.status).toBe(200);
  });
});

describe("GET /api/admin/sites", () => {
  it("lists sites without secrets", async () => {
    const { cookie } = await makeAdmin();
    await makeSite("S-A");
    await makeSite("S-B");
    const res = await sitesGET(req("GET", "/api/admin/sites", cookie));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { sites: Array<{ id: string; code: string; name: string }> };
    expect(body.sites.map((s) => s.code)).toEqual(expect.arrayContaining(["S-A", "S-B"]));
    expect(Object.keys(body.sites[0]!).sort()).toEqual(["code", "id", "name"]);
  });
});

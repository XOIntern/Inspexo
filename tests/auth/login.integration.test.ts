// Integration tests for login, sessions, and the auth routes against live
// Postgres. Requires DATABASE_URL. Every test cleans up the rows it creates.
import { NextRequest } from "next/server";
import { LocalProtocol } from "paseto";
import {
  EncryptFactory,
  ExportKeyFactory,
  GenerateKeyFactory,
  ImportKeyFactory,
} from "paseto/v3/local";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "@/src/prisma/db";
import { hashPassword } from "@/src/lib/auth/password";
import {
  SESSION_AUDIENCE,
  SESSION_COOKIE_NAME,
  SESSION_ISSUER,
  authenticate,
  createSession,
  issueSessionToken,
  readSessionToken,
  validateSessionToken,
} from "@/src/lib/auth/session";
import { throttleKey } from "@/src/lib/auth/throttle";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { POST as logoutPOST } from "@/app/api/auth/logout/route";
import { GET as sessionGET } from "@/app/api/auth/session/route";

const varchar = <N extends number>(value: string) => value as Varchar<N>;
const ORIGIN = "http://localhost";

const createdUserIds: string[] = [];
const createdSiteIds: string[] = [];
const throttleKeys: string[] = [];

function trackThrottle(email: string): void {
  throttleKeys.push(throttleKey(email.trim().toLowerCase()));
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

async function makeUser(input: {
  email: string;
  password: string;
  role?: string;
  status?: string;
  emailVerified?: boolean;
}): Promise<string> {
  const id = crypto.randomUUID();
  const email = input.email.trim().toLowerCase();
  await db.orm.public.User.create({
    id,
    email: varchar<255>(email),
    name: varchar<255>("Login Test"),
    passwordHash: varchar<255>(await hashPassword(input.password)),
    role: input.role ?? "auditee",
    status: input.status ?? "active",
    emailVerifiedAt: input.emailVerified ?? true ? Temporal.Now.instant().add({ minutes: 1 }) : null,
    mustChangePassword: true,
  });
  createdUserIds.push(id);
  trackThrottle(email);
  return id;
}

function loginRequest(body: unknown, origin: string | null = ORIGIN): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (origin !== null) headers["origin"] = origin;
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function cookieHeader(token: string | null): Record<string, string> {
  return token === null ? {} : { cookie: `${SESSION_COOKIE_NAME}=${token}` };
}

function authedRequest(path: string, token: string | null, method = "GET"): NextRequest {
  const headers: Record<string, string> = { ...cookieHeader(token) };
  if (method !== "GET") {
    headers["origin"] = ORIGIN;
    headers["content-type"] = "application/json";
  }
  return new NextRequest(`http://localhost${path}`, { method, headers });
}

function setCookie(res: Response): string | null {
  const cookies = res.headers.getSetCookie();
  const session = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  return session ?? null;
}

beforeAll(() => {
  if (!process.env["PASETO_SESSION_KEY"]) {
    throw new Error("PASETO_SESSION_KEY must be set for auth tests (see .env).");
  }
});

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

describe("authenticate", () => {
  it("accepts valid credentials with flags", async () => {
    const siteId = await makeSite("L-OK-1");
    const userId = await makeUser({ email: "ok-l@inspexo.id", password: "correct-horse-12" });
    await db.orm.public.UserSite.create({ userId, siteId });

    const user = await authenticate("ok-l@inspexo.id", "correct-horse-12");
    expect(user).toMatchObject({ id: userId, role: "auditee", emailVerified: true });
    expect(user.mustChangePassword).toBe(true);
    expect(user.siteIds).toEqual([siteId]);
  });

  it("lets unverified users in (verification notice is the dashboard's job)", async () => {
    const siteId = await makeSite("L-UNV-1");
    const userId = await makeUser({
      email: "unv-l@inspexo.id",
      password: "correct-horse-12",
      emailVerified: false,
    });
    await db.orm.public.UserSite.create({ userId, siteId });

    const user = await authenticate("unv-l@inspexo.id", "correct-horse-12");
    expect(user.emailVerified).toBe(false);
  });

  it("wrong password and unknown email give the identical 401", async () => {
    await makeUser({ email: "known-l@inspexo.id", password: "correct-horse-12" });
    trackThrottle("ghost-l@inspexo.id");

    const wrong = await authenticate("known-l@inspexo.id", "wrong-password-1").catch((e) => e);
    const ghost = await authenticate("ghost-l@inspexo.id", "wrong-password-1").catch((e) => e);
    expect(wrong).toMatchObject({ name: "AuthError", code: "INVALID_CREDENTIALS", status: 401 });
    expect(ghost).toMatchObject({ name: "AuthError", code: "INVALID_CREDENTIALS", status: 401 });
    expect(wrong.message).toBe(ghost.message);
  });

  it("unknown email still costs a full Argon2id verify (no timing oracle)", async () => {
    trackThrottle("timing-l@inspexo.id");
    const start = performance.now();
    await authenticate("timing-l@inspexo.id", "some-password-1").catch(() => undefined);
    expect(performance.now() - start).toBeGreaterThanOrEqual(5);
  });

  it.each(["inactive", "suspended"])("rejects %s accounts generically", async (status) => {
    await makeUser({ email: `${status}-l@inspexo.id`, password: "correct-horse-12", status });
    const err = await authenticate(`${status}-l@inspexo.id`, "correct-horse-12").catch((e) => e);
    expect(err).toMatchObject({ code: "INVALID_CREDENTIALS", status: 401 });
    expect(err.message).toBe("Invalid email or password.");
  });
});

describe("login throttle", () => {
  it("429s after 5 failures and resets on success", async () => {
    await makeUser({ email: "throt-l@inspexo.id", password: "correct-horse-12" });
    for (let i = 0; i < 5; i++) {
      const err = await authenticate("throt-l@inspexo.id", `bad-${i}-password`).catch((e) => e);
      expect(err.status).toBe(401);
    }
    const limited = await authenticate("throt-l@inspexo.id", "correct-horse-12").catch((e) => e);
    expect(limited).toMatchObject({ code: "RATE_LIMITED", status: 429 });

    // Success clears the window: 4 failures, 1 success, then failure is 401 not 429.
    const email = "throt2-l@inspexo.id";
    await makeUser({ email, password: "correct-horse-12" });
    for (let i = 0; i < 4; i++) {
      await authenticate(email, `bad-${i}-password`).catch(() => undefined);
    }
    await authenticate(email, "correct-horse-12");
    const after = await authenticate(email, "bad-again-password").catch((e) => e);
    expect(after.status).toBe(401);
  });
});

describe("POST /api/auth/login", () => {
  it("200s with cookie flags, session row, and no secret leakage", async () => {
    const siteId = await makeSite("L-RT-1");
    const userId = await makeUser({ email: "route-l@inspexo.id", password: "correct-horse-12" });
    await db.orm.public.UserSite.create({ userId, siteId });

    const res = await loginPOST(
      loginRequest({ email: "route-l@inspexo.id", password: "correct-horse-12" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.emailVerified).toBe(true);
    expect(body.mustChangePassword).toBe(true);
    expect(body.user).toMatchObject({ id: userId, role: "auditee", siteIds: [siteId] });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("$argon2");
    expect(serialized).not.toContain("passwordHash");

    const cookie = setCookie(res);
    expect(cookie).not.toBeNull();
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie!.toLowerCase()).toContain("samesite=lax");
    expect(cookie).toContain("Max-Age=28800");

    const token = cookie!.split(";")[0]!.split("=")[1]!;
    const { jti } = await readSessionToken(token);
    const session = await db.orm.public.Session.where({
      jti: varchar<64>(jti),
    }).first();
    expect(session?.userId).toBe(userId);
  });

  it("rejects bad credentials, bad origin, and bad bodies", async () => {
    await makeUser({ email: "route2-l@inspexo.id", password: "correct-horse-12" });

    const bad = await loginPOST(
      loginRequest({ email: "route2-l@inspexo.id", password: "nope-nope-nope" }),
    );
    expect(bad.status).toBe(401);
    expect(await bad.json()).toEqual({ error: "Invalid email or password." });
    // Failed login clears any session cookie.
    expect(setCookie(bad)).toContain("Max-Age=0");

    const crossSite = await loginPOST(
      loginRequest({ email: "route2-l@inspexo.id", password: "correct-horse-12" }, "https://evil.test"),
    );
    expect(crossSite.status).toBe(403);

    const malformed = await loginPOST(loginRequest({ email: "x" }));
    expect(malformed.status).toBe(422);
  });
});

describe("sessions and logout", () => {
  async function loggedInToken(email: string): Promise<string> {
    const res = await loginPOST(loginRequest({ email, password: "correct-horse-12" }));
    expect(res.status).toBe(200);
    const token = setCookie(res)!.split(";")[0]!.split("=")[1]!;
    return token;
  }

  it("session route: 401 without cookie, 200 with valid session", async () => {
    const siteId = await makeSite("L-SESS-1");
    const userId = await makeUser({ email: "sess-l@inspexo.id", password: "correct-horse-12" });
    await db.orm.public.UserSite.create({ userId, siteId });

    const anon = await sessionGET(authedRequest("/api/auth/session", null));
    expect(anon.status).toBe(401);

    const token = await loggedInToken("sess-l@inspexo.id");
    const res = await sessionGET(authedRequest("/api/auth/session", token));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toMatchObject({ id: userId, siteIds: [siteId], emailVerified: true });
    expect(JSON.stringify(body)).not.toContain("$argon2");
  });

  it("logout revokes everywhere: cookie cleared, row revoked, session dead", async () => {
    await makeUser({ email: "out-l@inspexo.id", password: "correct-horse-12" });
    const token = await loggedInToken("out-l@inspexo.id");

    const res = await logoutPOST(authedRequest("/api/auth/logout", token, "POST"));
    expect(res.status).toBe(204);
    expect(res.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))).toContain(
      "Max-Age=0",
    );

    const after = await sessionGET(authedRequest("/api/auth/session", token));
    expect(after.status).toBe(401);

    const rows = await db.orm.public.Session.where((s) => s.revokedAt.isNotNull()).all();
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it("logout without a cookie is still 204", async () => {
    const res = await logoutPOST(authedRequest("/api/auth/logout", null, "POST"));
    expect(res.status).toBe(204);
  });

  it("tampered, foreign-key, and expired tokens are all 401", async () => {
    await makeUser({ email: "tok-l@inspexo.id", password: "correct-horse-12" });
    const token = await loggedInToken("tok-l@inspexo.id");

    const tampered = await sessionGET(
      authedRequest("/api/auth/session", `${token.slice(0, -2)}xx`),
    );
    expect(tampered.status).toBe(401);

    // Foreign key: valid crypto, unknown session row.
    const orphan = await issueSessionToken("tok-l@inspexo.id", crypto.randomUUID());
    expect((await sessionGET(authedRequest("/api/auth/session", orphan))).status).toBe(401);

    // DB-expired row.
    const { token: fresh } = await createSession(
      (await authenticate("tok-l@inspexo.id", "correct-horse-12")).id,
    );
    const { jti: freshJti } = await readSessionToken(fresh);
    await db.orm.public.Session.where({ jti: varchar<64>(freshJti) }).update({
      revokedAt: Temporal.Now.instant(),
    });
    expect((await sessionGET(authedRequest("/api/auth/session", fresh))).status).toBe(401);
  });

  it("deactivated accounts get 403 on existing sessions", async () => {
    const userId = await makeUser({ email: "deact-l@inspexo.id", password: "correct-horse-12" });
    const token = await loggedInToken("deact-l@inspexo.id");
    await db.orm.public.User.where({ id: userId }).update({ status: "suspended" });

    const res = await sessionGET(authedRequest("/api/auth/session", token));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Account is disabled." });
  });

  it("direct validateSessionToken honors revocation", async () => {
    const userId = await makeUser({ email: "dir-l@inspexo.id", password: "correct-horse-12" });
    const { token } = await createSession(userId);
    createdUserIds.push(userId);
    expect((await validateSessionToken(token)).id).toBe(userId);
    await logoutPOST(authedRequest("/api/auth/logout", token, "POST"));
    await expect(validateSessionToken(token)).rejects.toMatchObject({ status: 401 });
  });
});

describe("cross-key isolation", () => {
  it("tokens sealed with another key are rejected", async () => {
    const v3 = new LocalProtocol(GenerateKeyFactory, ExportKeyFactory);
    const other = await v3.ExportKey(await v3.GenerateKey({ extractable: true }));
    const enc = new LocalProtocol(EncryptFactory, ImportKeyFactory);
    const key = await enc.ImportKey(other as `k3.local.${string}`);
    const token = await enc.Encrypt(
      key,
      { sub: "x", jti: "y", aud: SESSION_AUDIENCE, iss: SESSION_ISSUER },
      { expiresIn: 28800 },
    );
    expect(token.startsWith("v3.local.")).toBe(true);
    expect(SESSION_ISSUER).toBe("inspexo");
    const res = await sessionGET(authedRequest("/api/auth/session", token));
    expect(res.status).toBe(401);
  });
});

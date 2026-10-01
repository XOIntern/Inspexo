// Integration tests for admin user management, requireUser, and adversarial
// authorization against live Postgres. Denial tests assert the database is
// UNCHANGED — an error code alone does not prove nothing was written.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "@/src/prisma/db";
import { cleanupAuditForUsers } from "./test-cleanup";
import {
  setUserStatus,
  updateUserRole,
  updateUserSites,
} from "@/src/lib/auth/admin";
import { requirePermission, requireRole, requireSiteAccess } from "@/src/lib/auth/authorize";
import type { PublicUser } from "@/src/lib/auth/session";
import { toPublicUser } from "@/src/lib/auth/session";

const store = vi.hoisted(() => ({ token: null as string | null }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      store.token !== null && name === "__Host-inspexo_session"
        ? { value: store.token }
        : undefined,
  }),
}));

const { requireUser } = await import("@/src/lib/auth/server-user");
const { createSession } = await import("@/src/lib/auth/session");

const varchar = <N extends number>(value: string) => value as Varchar<N>;

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
    name: varchar<255>("Authz Test"),
    passwordHash: varchar<255>("-"),
    role,
    status,
  });
  createdUserIds.push(id);
  return id;
}

async function assign(userId: string, siteId: string): Promise<void> {
  await db.orm.public.UserSite.create({ userId, siteId });
}

async function sitesOf(userId: string): Promise<string[]> {
  const rows = await db.orm.public.UserSite.where({ userId }).all();
  return rows.map((r) => r.siteId).sort();
}

async function roleOf(userId: string): Promise<string> {
  const row = await db.orm.public.User.where({ id: userId }).first();
  return row!.role;
}

async function expectDenied(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect((error as { code?: string }).code).toBe(code);
    return;
  }
  throw new Error(`expected denial ${code}, but the call succeeded`);
}

afterEach(async () => {
  store.token = null;
  const userIds = createdUserIds.splice(0);
  for (const id of userIds) {
    await db.orm.public.User.where({ id }).delete();
  }
  for (const id of createdSiteIds.splice(0)) {
    await db.orm.public.Site.where({ id }).delete();
  }
  await cleanupAuditForUsers(userIds);
});

describe("updateUserRole", () => {
  it("changes role when cardinality still holds", async () => {
    const adminId = await makeUser("adm-r1@inspexo.id", "admin");
    const siteId = await makeSite("R-R1");
    const userId = await makeUser("t-r1@inspexo.id", "auditee");
    await assign(userId, siteId);

    await expect(updateUserRole(adminId, userId, "auditor")).resolves.toEqual({
      id: userId,
      role: "auditor",
    });
    expect(await roleOf(userId)).toBe("auditor");
  });

  it("rejects cardinality-breaking changes without touching the row", async () => {
    const adminId = await makeUser("adm-r2@inspexo.id", "admin");
    const userId = await makeUser("t-r2@inspexo.id", "auditor");
    await assign(userId, await makeSite("R-R2A"));
    await assign(userId, await makeSite("R-R2B"));

    await expectDenied(updateUserRole(adminId, userId, "auditee"), "SITE_CARDINALITY");
    expect(await roleOf(userId)).toBe("auditor");
  });

  it("never assigns admin and rejects garbage", async () => {
    const adminId = await makeUser("adm-r3@inspexo.id", "admin");
    const userId = await makeUser("t-r3@inspexo.id", "auditee");
    await expectDenied(updateUserRole(adminId, userId, "admin"), "ROLE_NOT_ASSIGNABLE");
    await expectDenied(updateUserRole(adminId, userId, "superadmin"), "ROLE_NOT_ASSIGNABLE");
    expect(await roleOf(userId)).toBe("auditee");
  });

  it("rejects self role change, unknown targets, and non-admin callers", async () => {
    const adminId = await makeUser("adm-r4@inspexo.id", "admin");
    const auditorId = await makeUser("aud-r4@inspexo.id", "auditor");
    const userId = await makeUser("t-r4@inspexo.id", "auditee");

    await expectDenied(updateUserRole(adminId, adminId, "auditor"), "SELF_ROLE_CHANGE");
    expect(await roleOf(adminId)).toBe("admin");
    await expectDenied(updateUserRole(adminId, crypto.randomUUID(), "auditor"), "USER_NOT_FOUND");
    await expectDenied(updateUserRole(auditorId, userId, "auditor"), "FORBIDDEN_NOT_ADMIN");
    await expectDenied(updateUserRole(null, userId, "auditor"), "UNAUTHENTICATED");
    expect(await roleOf(userId)).toBe("auditee");
  });
});

describe("updateUserSites", () => {
  it("replaces assignments wholesale", async () => {
    const adminId = await makeUser("adm-s1@inspexo.id", "admin");
    const oldSite = await makeSite("R-S1-OLD");
    const s1 = await makeSite("R-S1-A");
    const s2 = await makeSite("R-S1-B");
    const userId = await makeUser("t-s1@inspexo.id", "auditor");
    await assign(userId, oldSite);

    await expect(updateUserSites(adminId, userId, [s1, s2])).resolves.toEqual({
      id: userId,
      siteIds: [s1, s2],
    });
    expect(await sitesOf(userId)).toEqual([s1, s2].sort());
  });

  it("rejects auditee multi-site and unknown sites atomically", async () => {
    const adminId = await makeUser("adm-s2@inspexo.id", "admin");
    const home = await makeSite("R-S2-HOME");
    const other = await makeSite("R-S2-OTHER");
    const userId = await makeUser("t-s2@inspexo.id", "auditee");
    await assign(userId, home);

    await expectDenied(updateUserSites(adminId, userId, [home, other]), "SITE_CARDINALITY");
    await expectDenied(updateUserSites(adminId, userId, [crypto.randomUUID()]), "UNKNOWN_SITE");
    expect(await sitesOf(userId)).toEqual([home]);
  });

  it("refuses sites for admin accounts and dedupes input", async () => {
    const adminId = await makeUser("adm-s3@inspexo.id", "admin");
    const siteId = await makeSite("R-S3");
    await expectDenied(updateUserSites(adminId, adminId, [siteId]), "SITE_CARDINALITY");

    const userId = await makeUser("t-s3@inspexo.id", "auditor");
    await expect(updateUserSites(adminId, userId, [siteId, siteId])).resolves.toEqual({
      id: userId,
      siteIds: [siteId],
    });
    expect(await sitesOf(userId)).toEqual([siteId]);
  });

  it("rejects non-admin callers", async () => {
    const auditorId = await makeUser("aud-s4@inspexo.id", "auditor");
    const userId = await makeUser("t-s4@inspexo.id", "auditee");
    const siteId = await makeSite("R-S4");
    await expectDenied(updateUserSites(auditorId, userId, [siteId]), "FORBIDDEN_NOT_ADMIN");
    await expectDenied(updateUserSites(null, userId, [siteId]), "UNAUTHENTICATED");
    expect(await sitesOf(userId)).toEqual([]);
  });
});

describe("setUserStatus", () => {
  it("deactivates and reactivates", async () => {
    const adminId = await makeUser("adm-t1@inspexo.id", "admin");
    const userId = await makeUser("t-t1@inspexo.id", "auditor");

    await expect(setUserStatus(adminId, userId, "suspended")).resolves.toEqual({
      id: userId,
      status: "suspended",
    });
    await expect(setUserStatus(adminId, userId, "active")).resolves.toMatchObject({
      status: "active",
    });
  });

  it("rejects self-deactivation without touching the row", async () => {
    const adminId = await makeUser("adm-t2@inspexo.id", "admin");
    const userId = await makeUser("t-t2@inspexo.id", "auditor");

    await expectDenied(setUserStatus(adminId, adminId, "inactive"), "SELF_DEACTIVATION");
    await expectDenied(setUserStatus(adminId, adminId, "suspended"), "SELF_DEACTIVATION");
    expect(await roleOf(adminId)).toBe("admin");
    await expectDenied(setUserStatus(adminId, userId, "archived"), "INVALID_INPUT");
    await expectDenied(setUserStatus(userId, adminId, "inactive"), "FORBIDDEN_NOT_ADMIN");
    const admin = await db.orm.public.User.where({ id: adminId }).first();
    expect(admin!.status).toBe("active");
  });
});

describe("requireUser", () => {
  it("returns the user for a valid cookie session", async () => {
    const siteId = await makeSite("R-U1");
    const userId = await makeUser("u1@inspexo.id", "auditor");
    await assign(userId, siteId);
    const { token } = await createSession(userId);
    createdUserIds.push(userId);
    store.token = token;

    const user = await requireUser();
    expect(user).toMatchObject({ id: userId, role: "auditor", siteIds: [siteId] });
  });

  it("401s on missing and garbage cookies", async () => {
    store.token = null;
    await expectDenied(requireUser(), "SESSION_INVALID");
    store.token = "not-a-token";
    await expectDenied(requireUser(), "SESSION_INVALID");
  });
});

describe("spoof resistance", () => {
  it("denies forged, foreign, and empty site IDs", async () => {
    const siteA = await makeSite("R-SP-A");
    const siteB = await makeSite("R-SP-B");
    const auditeeA = await makeUser("a-sp@inspexo.id", "auditee");
    const auditeeB = await makeUser("b-sp@inspexo.id", "auditee");
    await assign(auditeeA, siteA);
    await assign(auditeeB, siteB);
    const userA = (await toPublicUser(auditeeA))!;

    // Another auditee's site, a forged UUID, and an empty string all fail
    // the row lookup — request input is never trusted.
    await expectDenied(requireSiteAccess(userA, siteB), "FORBIDDEN_SITE");
    await expectDenied(requireSiteAccess(userA, crypto.randomUUID()), "FORBIDDEN_SITE");
    await expectDenied(requireSiteAccess(userA, ""), "FORBIDDEN_SITE");
    await expect(requireSiteAccess(userA, siteA)).resolves.toBe(userA);
  });

  it("denies users with no assignments, including admins", async () => {
    const adminId = await makeUser("adm-sp@inspexo.id", "admin");
    const siteId = await makeSite("R-SP-C");
    const admin = (await toPublicUser(adminId))!;
    await expectDenied(requireSiteAccess(admin, siteId), "FORBIDDEN_SITE");
  });

  it("auditee cannot reach permission-gated auditor actions", async () => {
    const userId = await makeUser("perm-sp@inspexo.id", "auditee");
    const user = (await toPublicUser(userId))!;
    try {
      requireRole(user, "auditor");
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as { code?: string }).code).toBe("FORBIDDEN_ROLE");
    }
    try {
      requirePermission(user, "audit.conduct");
      throw new Error("should have thrown");
    } catch (error) {
      expect((error as { code?: string }).code).toBe("FORBIDDEN_PERMISSION");
    }
    // ...while the same user passes its own gates.
    expect(requireRole(user, "auditee")).toBe(user);
    expect(requirePermission(user, "inspection.daily")).toBe(user);
  });
});

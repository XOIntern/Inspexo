// Integration tests for the contact endpoint, dashboard Server Actions,
// and the audit trail against live Postgres.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "@/src/prisma/db";
import { hashPassword } from "@/src/lib/auth/password";
import { SESSION_COOKIE_NAME, createSession } from "@/src/lib/auth/session";
import { updateUserContact } from "@/src/lib/auth/admin";
import { provisionUser } from "@/src/lib/auth/provision";
import { issueVerificationToken } from "@/src/lib/auth/verification";

const store = vi.hoisted(() => ({ token: null as string | null }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      store.token !== null && name === "__Host-inspexo_session"
        ? { value: store.token }
        : undefined,
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: () => undefined,
}));

const { createUser, updateUser, setUserStatus } = await import(
  "@/app/dashboard/users/actions"
);

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

async function makeAdmin(): Promise<string> {
  const id = crypto.randomUUID();
  await db.orm.public.User.create({
    id,
    email: varchar<255>(`adm-${id.slice(0, 8)}@inspexo.id`),
    name: varchar<255>("Admin"),
    passwordHash: varchar<255>(await hashPassword("admin-correct-12")),
    role: "admin",
    status: "active",
  });
  createdUserIds.push(id);
  return id;
}

async function adminSession(adminId: string): Promise<void> {
  const { token } = await createSession(adminId);
  store.token = token;
}

async function auditRows(targetUserId: string, action: string) {
  return db.orm.public.AuditLog.where((a) =>
    a.targetUserId.eq(targetUserId),
  ).all().then((rows) => rows.filter((r) => r.action === action));
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

describe("updateUserContact", () => {
  it("renames without touching verification", async () => {
    const adminId = await makeAdmin();
    const siteId = await makeSite("C-1");
    const { user } = await provisionUser(adminId, {
      name: "Old Name",
      email: "contact@inspexo.id",
      role: "auditee",
      siteIds: [siteId],
    });
    createdUserIds.push(user.id);

    const result = await updateUserContact(adminId, user.id, { name: "New Name" });
    expect(result).toMatchObject({ name: "New Name", email: "contact@inspexo.id" });
  });

  it("resets verification and kills live tokens on email change", async () => {
    const adminId = await makeAdmin();
    const siteId = await makeSite("C-2");
    const { user } = await provisionUser(adminId, {
      name: "Contact",
      email: "before@inspexo.id",
      role: "auditee",
      siteIds: [siteId],
    });
    createdUserIds.push(user.id);
    const { rawToken } = await issueVerificationToken(user.id);

    const result = await updateUserContact(adminId, user.id, { email: "after@inspexo.id" });
    expect(result.emailVerified).toBe(false);

    const row = await db.orm.public.User.where({ id: user.id }).first();
    expect(row!.email).toBe("after@inspexo.id");
    expect(row!.emailVerifiedAt).toBeNull();
    const { consumeVerificationToken } = await import("@/src/lib/auth/verification");
    await expect(consumeVerificationToken(rawToken)).rejects.toMatchObject({
      code: "INVALID_TOKEN",
    });
  });

  it("rejects duplicates, garbage, and strangers", async () => {
    const adminId = await makeAdmin();
    const siteId = await makeSite("C-3");
    const first = await provisionUser(adminId, {
      name: "First",
      email: "first@inspexo.id",
      role: "auditee",
      siteIds: [siteId],
    });
    const second = await provisionUser(adminId, {
      name: "Second",
      email: "second@inspexo.id",
      role: "auditee",
      siteIds: [siteId],
    });
    createdUserIds.push(first.user.id, second.user.id);

    await expect(updateUserContact(adminId, second.user.id, { email: "FIRST@inspexo.id" })).rejects.toMatchObject({
      code: "DUPLICATE_EMAIL",
    });
    await expect(updateUserContact(adminId, second.user.id, {})).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    await expect(updateUserContact(null, second.user.id, { name: "X" })).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    const row = await db.orm.public.User.where({ id: second.user.id }).first();
    expect(row!.email).toBe("second@inspexo.id");
  });
});

describe("dashboard Server Actions (H-1)", () => {
  it("rejects unauthenticated and non-admin callers", async () => {
    const siteId = await makeSite("A-1");
    store.token = null;
    await expect(
      createUser({ name: "X", email: "x@inspexo.id", role: "auditee", status: "active", siteIds: [siteId] }),
    ).rejects.toMatchObject({ code: "SESSION_INVALID" });

    const auditorId = crypto.randomUUID();
    await db.orm.public.User.create({
      id: auditorId,
      email: varchar<255>("aud-a@inspexo.id"),
      name: varchar<255>("Auditor"),
      passwordHash: varchar<255>(await hashPassword("user-correct-12")),
      role: "auditor",
      status: "active",
    });
    createdUserIds.push(auditorId);
    const { token } = await createSession(auditorId);
    store.token = token;
    await expect(
      createUser({ name: "X", email: "y@inspexo.id", role: "auditee", status: "active", siteIds: [siteId] }),
    ).rejects.toMatchObject({ code: "FORBIDDEN_NOT_ADMIN" });
    await expect(updateUser({ id: auditorId, name: "Z", email: "aud-a@inspexo.id", role: "auditor", status: "active" })).rejects.toMatchObject({
      code: "FORBIDDEN_NOT_ADMIN",
    });
    await expect(setUserStatus({ id: auditorId, status: "inactive" })).rejects.toMatchObject({
      code: "FORBIDDEN_NOT_ADMIN",
    });
    expect(await db.orm.public.User.where({ email: varchar<255>("y@inspexo.id") }).first()).toBeNull();
  });

  it("lets admins create, update, and toggle through the backend", async () => {
    const adminId = await makeAdmin();
    await adminSession(adminId);
    const siteId = await makeSite("A-2");

    const created = await createUser({
      name: "Action Hire",
      email: "hire-a@inspexo.id",
      role: "auditee",
      status: "active",
      siteIds: [siteId],
    });
    createdUserIds.push(created.id);
    expect(created.tempPassword).toHaveLength(20);

    await updateUser({
      id: created.id,
      name: "Action Renamed",
      email: "hire-a@inspexo.id",
      role: "auditor",
      status: "active",
    });
    // auditor with one site still satisfies cardinality.
    const after = await db.orm.public.User.where({ id: created.id }).first();
    expect(after!.name).toBe("Action Renamed");
    expect(after!.role).toBe("auditor");

    await setUserStatus({ id: created.id, status: "inactive" });
    expect((await db.orm.public.User.where({ id: created.id }).first())!.status).toBe("inactive");
  });
});

describe("audit trail", () => {
  it("records privileged actions with actor and target", async () => {
    const adminId = await makeAdmin();
    const siteId = await makeSite("AU-1");
    const { user } = await provisionUser(adminId, {
      name: "Audited",
      email: "audited@inspexo.id",
      role: "auditee",
      siteIds: [siteId],
    });
    createdUserIds.push(user.id);

    expect(await auditRows(user.id, "user.provisioned")).toHaveLength(1);
    const [provisioned] = await auditRows(user.id, "user.provisioned");
    expect(provisioned!.actorId).toBe(adminId);
  });
});

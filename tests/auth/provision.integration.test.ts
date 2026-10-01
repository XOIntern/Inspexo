// Integration tests for admin provisioning against live Postgres.
// Requires DATABASE_URL (loaded from .env via src/prisma/db.ts).
// Tables are empty in dev; every test cleans up the rows it creates.
import { verify } from "@node-rs/argon2";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";

import { db } from "@/src/prisma/db";
import { ProvisionError } from "@/src/lib/auth/errors";
import { provisionUser } from "@/src/lib/auth/provision";

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

async function makeUser(input: {
  email: string;
  role: string;
  status?: string;
  passwordHash?: string | null;
}): Promise<string> {
  const id = crypto.randomUUID();
  await db.orm.public.User.create({
    id,
    email: varchar<255>(input.email),
    name: varchar<255>("Test User"),
    passwordHash: input.passwordHash === null ? null : varchar<255>(input.passwordHash ?? "-"),
    role: input.role,
    status: input.status ?? "active",
  });
  createdUserIds.push(id);
  return id;
}

async function expectProvisionError(
  promise: Promise<unknown>,
  code: string,
): Promise<ProvisionError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ProvisionError);
    expect((error as ProvisionError).code).toBe(code);
    return error as ProvisionError;
  }
  throw new Error(`expected ProvisionError ${code}, but provisioning succeeded`);
}

beforeEach(async () => {
  createdUserIds.length = 0;
  createdSiteIds.length = 0;
});

afterEach(async () => {
  // Users first: delete cascades UserSite / tokens / sessions.
  for (const id of createdUserIds) {
    await db.orm.public.User.where({ id }).delete();
  }
  for (const id of createdSiteIds) {
    await db.orm.public.Site.where({ id }).delete();
  }
});

describe("happy paths", () => {
  it("admin provisions an auditee with exactly one site", async () => {
    const adminId = await makeUser({ email: "admin-1-t@inspexo.id", role: "admin" });
    const siteId = await makeSite("T-AUDITEE-1");

    const result = await provisionUser(adminId, {
      name: "Sari Wulandari",
      email: "sari-t@inspexo.id",
      role: "auditee",
      siteIds: [siteId],
    });
    createdUserIds.push(result.user.id);

    expect(result.tempPassword).toHaveLength(20);
    expect(result.user).toMatchObject({
      email: "sari-t@inspexo.id",
      role: "auditee",
      status: "active",
      mustChangePassword: true,
    });
    expect(result.user.siteIds).toEqual([siteId]);

    const row = await db.orm.public.User.where({ id: result.user.id }).first();
    expect(row?.emailVerifiedAt).toBeNull();
    expect(row?.mustChangePassword).toBe(true);
    expect(row?.passwordHash).not.toBe(result.tempPassword);
    expect(await verify(row?.passwordHash as string, result.tempPassword)).toBe(true);

    const assignments = await db.orm.public.UserSite.where({ userId: result.user.id }).all();
    expect(assignments.map((a) => a.siteId)).toEqual([siteId]);
  });

  it("admin provisions an auditor with multiple sites", async () => {
    const adminId = await makeUser({ email: "admin-2-t@inspexo.id", role: "admin" });
    const s1 = await makeSite("T-AUD-1");
    const s2 = await makeSite("T-AUD-2");

    const result = await provisionUser(adminId, {
      name: "Budi Santoso",
      email: "budi-t@inspexo.id",
      role: "auditor",
      siteIds: [s1, s2],
    });
    createdUserIds.push(result.user.id);

    expect([...result.user.siteIds].sort()).toEqual([...[s1, s2]].sort());
  });

  it("admin provisions an inactive verificator", async () => {
    const adminId = await makeUser({ email: "admin-3-t@inspexo.id", role: "admin" });
    const siteId = await makeSite("T-VER-1");

    const result = await provisionUser(adminId, {
      name: "Dewi Lestari",
      email: "dewi-t@inspexo.id",
      role: "verificator",
      siteIds: [siteId],
      status: "inactive",
    });
    createdUserIds.push(result.user.id);
    expect(result.user.status).toBe("inactive");
  });

  it("dedupes a repeated site id for an auditee", async () => {
    const adminId = await makeUser({ email: "admin-4-t@inspexo.id", role: "admin" });
    const siteId = await makeSite("T-DEDUP-1");

    const result = await provisionUser(adminId, {
      name: "Andi Pratama",
      email: "andi-t@inspexo.id",
      role: "auditee",
      siteIds: [siteId, siteId],
    });
    createdUserIds.push(result.user.id);
    expect(result.user.siteIds).toEqual([siteId]);
  });
});

describe("caller authorization", () => {
  it("null caller is unauthenticated", async () => {
    await expectProvisionError(
      provisionUser(null, {
        name: "X",
        email: "x-t@inspexo.id",
        role: "auditee",
        siteIds: [crypto.randomUUID()],
      }),
      "UNAUTHENTICATED",
    );
  });

  it("unknown caller id is unauthenticated", async () => {
    await expectProvisionError(
      provisionUser(crypto.randomUUID(), {
        name: "X",
        email: "x2-t@inspexo.id",
        role: "auditee",
        siteIds: [crypto.randomUUID()],
      }),
      "UNAUTHENTICATED",
    );
  });

  it.each(["verificator", "auditor", "auditee"])(
    "business role %s cannot provision",
    async (role) => {
      const siteId = await makeSite(`T-NOADM-${role}`);
      const callerId = await makeUser({ email: `${role}-t@inspexo.id`, role });
      await db.orm.public.UserSite.create({ userId: callerId, siteId });
      await expectProvisionError(
        provisionUser(callerId, {
          name: "X",
          email: `x-${role}-t@inspexo.id`,
          role: "auditee",
          siteIds: [siteId],
        }),
        "FORBIDDEN_NOT_ADMIN",
      );
    },
  );

  it("inactive admin cannot provision", async () => {
    const adminId = await makeUser({
      email: "admin-off-t@inspexo.id",
      role: "admin",
      status: "inactive",
    });
    await expectProvisionError(
      provisionUser(adminId, {
        name: "X",
        email: "x-off-t@inspexo.id",
        role: "auditee",
        siteIds: [crypto.randomUUID()],
      }),
      "ACCOUNT_DISABLED",
    );
  });

  it("re-reads the caller: admin demoted mid-session is denied", async () => {
    const adminId = await makeUser({ email: "admin-dem-t@inspexo.id", role: "admin" });
    const siteId = await makeSite("T-DEM-1");
    await db.orm.public.User.where({ id: adminId }).update({ role: "auditor" });
    await expectProvisionError(
      provisionUser(adminId, {
        name: "X",
        email: "x-dem-t@inspexo.id",
        role: "auditee",
        siteIds: [siteId],
      }),
      "FORBIDDEN_NOT_ADMIN",
    );
  });
});

describe("input and scope validation", () => {
  it("rejects assigning the admin role", async () => {
    const adminId = await makeUser({ email: "admin-5-t@inspexo.id", role: "admin" });
    await expectProvisionError(
      provisionUser(adminId, {
        name: "Second Admin",
        email: "second-admin-t@inspexo.id",
        role: "admin",
        siteIds: [],
      }),
      "INVALID_INPUT",
    );
  });

  it("rejects auditee with zero or two sites", async () => {
    const adminId = await makeUser({ email: "admin-6-t@inspexo.id", role: "admin" });
    const siteId = await makeSite("T-CARD-1");
    const other = await makeSite("T-CARD-2");
    await expectProvisionError(
      provisionUser(adminId, {
        name: "X",
        email: "x-c0-t@inspexo.id",
        role: "auditee",
        siteIds: [],
      }),
      "SITE_CARDINALITY",
    );
    await expectProvisionError(
      provisionUser(adminId, {
        name: "X",
        email: "x-c2-t@inspexo.id",
        role: "auditee",
        siteIds: [siteId, other],
      }),
      "SITE_CARDINALITY",
    );
  });

  it("rejects auditor with no sites", async () => {
    const adminId = await makeUser({ email: "admin-7-t@inspexo.id", role: "admin" });
    await expectProvisionError(
      provisionUser(adminId, {
        name: "X",
        email: "x-c3-t@inspexo.id",
        role: "auditor",
        siteIds: [],
      }),
      "SITE_CARDINALITY",
    );
  });

  it("rejects unknown site ids and creates nothing", async () => {
    const adminId = await makeUser({ email: "admin-8-t@inspexo.id", role: "admin" });
    await expectProvisionError(
      provisionUser(adminId, {
        name: "Ghost",
        email: "ghost-t@inspexo.id",
        role: "auditee",
        siteIds: [crypto.randomUUID()],
      }),
      "UNKNOWN_SITE",
    );
    expect(await db.orm.public.User.where({ email: varchar<255>("ghost-t@inspexo.id") }).first()).toBeNull();
  });

  it("rejects duplicate and case-variant duplicate email", async () => {
    const adminId = await makeUser({ email: "admin-9-t@inspexo.id", role: "admin" });
    const siteId = await makeSite("T-DUP-1");
    const first = await provisionUser(adminId, {
      name: "Fitri Handayani",
      email: "fitri-t@inspexo.id",
      role: "auditee",
      siteIds: [siteId],
    });
    createdUserIds.push(first.user.id);

    await expectProvisionError(
      provisionUser(adminId, {
        name: "Copy",
        email: "fitri-t@inspexo.id",
        role: "auditee",
        siteIds: [siteId],
      }),
      "DUPLICATE_EMAIL",
    );
    await expectProvisionError(
      provisionUser(adminId, {
        name: "Copy",
        email: "FITRI-T@INSPEXO.ID",
        role: "auditee",
        siteIds: [siteId],
      }),
      "DUPLICATE_EMAIL",
    );
  });

  it("rejects bad email and empty name", async () => {
    const adminId = await makeUser({ email: "admin-10-t@inspexo.id", role: "admin" });
    const siteId = await makeSite("T-VAL-1");
    await expectProvisionError(
      provisionUser(adminId, {
        name: "X",
        email: "not-an-email",
        role: "auditee",
        siteIds: [siteId],
      }),
      "INVALID_INPUT",
    );
    await expectProvisionError(
      provisionUser(adminId, {
        name: "  ",
        email: "x-val-t@inspexo.id",
        role: "auditee",
        siteIds: [siteId],
      }),
      "INVALID_INPUT",
    );
  });
});

// Unit tests for admin provisioning: no database. Validation, cardinality,
// temp-password shape, and role policy live here; anything touching rows is
// in provision.integration.test.ts.
import { describe, expect, it } from "vitest";

import {
  ASSIGNABLE_ROLES,
  MAX_SITES,
  MIN_SITES,
  isAssignableRole,
} from "@/src/lib/auth/roles";
import { PROVISION_ERROR_CODES } from "@/src/lib/auth/errors";
import {
  TEMP_PASSWORD_LENGTH,
  generateTempPassword,
  hashPassword,
} from "@/src/lib/auth/password";
import { provisionInputSchema } from "@/src/lib/auth/provision";

describe("role policy", () => {
  it("assignable roles exclude admin", () => {
    expect([...ASSIGNABLE_ROLES]).toEqual(["verificator", "auditor", "auditee"]);
    expect(isAssignableRole("admin")).toBe(false);
    expect(isAssignableRole("verificator")).toBe(true);
    expect(isAssignableRole("hse_officer")).toBe(false);
    expect(isAssignableRole("")).toBe(false);
  });

  it("auditee is exactly one site; verificator/auditor are one-or-more", () => {
    expect(MIN_SITES).toEqual({ verificator: 1, auditor: 1, auditee: 1 });
    expect(MAX_SITES.auditee).toBe(1);
    expect(MAX_SITES.verificator).toBe(Number.POSITIVE_INFINITY);
    expect(MAX_SITES.auditor).toBe(Number.POSITIVE_INFINITY);
  });

  it("error codes are a fixed set", () => {
    expect([...PROVISION_ERROR_CODES]).toContain("UNAUTHENTICATED");
    expect([...PROVISION_ERROR_CODES]).toContain("FORBIDDEN_NOT_ADMIN");
    expect([...PROVISION_ERROR_CODES]).toContain("SITE_CARDINALITY");
  });
});

describe("provisionInputSchema", () => {
  const base = {
    name: "Sari Wulandari",
    email: "sari.wulandari@inspexo.id",
    role: "auditee",
    siteIds: [crypto.randomUUID()],
  };

  it("accepts a minimal valid input with defaults", () => {
    const parsed = provisionInputSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe("active");
      expect(parsed.data.department).toBeUndefined();
    }
  });

  it("normalizes email to lowercase and trims", () => {
    const parsed = provisionInputSchema.safeParse({
      ...base,
      email: "  SARI.Wulandari@INSPEXO.ID ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("sari.wulandari@inspexo.id");
  });

  it.each(["admin", "hse_officer", "viewer", "", "ADMIN"])(
    "rejects non-assignable role %j",
    (role) => {
      expect(provisionInputSchema.safeParse({ ...base, role }).success).toBe(false);
    },
  );

  it.each(["not-an-email", "", "a@b"])("rejects bad email %j", (email) => {
    expect(provisionInputSchema.safeParse({ ...base, email }).success).toBe(false);
  });

  it("rejects empty name and bad status", () => {
    expect(provisionInputSchema.safeParse({ ...base, name: "  " }).success).toBe(false);
    expect(provisionInputSchema.safeParse({ ...base, status: "pending" }).success).toBe(false);
  });

  it("rejects non-uuid site ids", () => {
    expect(
      provisionInputSchema.safeParse({ ...base, siteIds: ["plant-1"] }).success,
    ).toBe(false);
  });
});

describe("temp password", () => {
  it("is 20 url-safe chars and unique per call", () => {
    const a = generateTempPassword();
    const b = generateTempPassword();
    expect(a).toHaveLength(TEMP_PASSWORD_LENGTH);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a).not.toBe(b);
  });

  it("hashes to a 97-char Argon2id string", async () => {
    const h = await hashPassword(generateTempPassword());
    expect(h).toHaveLength(97);
    expect(h.startsWith("$argon2id$v=19$m=19456,t=2,p=1$")).toBe(true);
  });
});

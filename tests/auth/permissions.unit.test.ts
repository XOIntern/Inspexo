// Unit tests for the permission map: pure, no database.
import { describe, expect, it } from "vitest";

import { hasPermission, PERMISSIONS, ROLE_PERMISSIONS } from "@/src/lib/auth/permissions";

describe("ROLE_PERMISSIONS", () => {
  it("grants each business role its own verbs and nothing else", () => {
    expect(ROLE_PERMISSIONS.auditor).toContain("audit.conduct");
    expect(ROLE_PERMISSIONS.verificator).toContain("verification.review");
    expect(ROLE_PERMISSIONS.auditee).toContain("inspection.daily");
  });

  it("gives admin system permissions and zero HSE permissions", () => {
    expect([...ROLE_PERMISSIONS.admin]).toEqual(["user.manage", "site.assign"]);
    for (const perm of PERMISSIONS) {
      if (perm === "user.manage" || perm === "site.assign") continue;
      expect(hasPermission("admin", perm)).toBe(false);
    }
  });

  it("keeps system permissions off business roles", () => {
    for (const role of ["verificator", "auditor", "auditee"] as const) {
      expect(hasPermission(role, "user.manage")).toBe(false);
      expect(hasPermission(role, "site.assign")).toBe(false);
    }
  });

  it("denies cross-role verbs and unknown roles (fail closed)", () => {
    expect(hasPermission("auditee", "audit.conduct")).toBe(false);
    expect(hasPermission("auditor", "inspection.daily")).toBe(false);
    expect(hasPermission("verificator", "finding.record")).toBe(false);
    expect(hasPermission("superadmin", "audit.conduct")).toBe(false);
    expect(hasPermission("", "user.manage")).toBe(false);
  });
});

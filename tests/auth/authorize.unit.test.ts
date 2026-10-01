// Unit tests for authorization gates: no database (requireRole is pure).
import { describe, expect, it } from "vitest";

import { AuthError } from "@/src/lib/auth/errors";
import { requireRole } from "@/src/lib/auth/authorize";
import type { PublicUser } from "@/src/lib/auth/session";

function user(role: string): PublicUser {
  return {
    id: "u-1",
    name: "Test",
    email: "t@inspexo.id",
    role,
    status: "active",
    department: null,
    emailVerified: true,
    mustChangePassword: false,
    siteIds: [],
  };
}

describe("requireRole", () => {
  it("returns the user when the role matches", () => {
    expect(requireRole(user("auditor"), "auditor", "admin")).toMatchObject({ role: "auditor" });
    expect(requireRole(user("admin"), "admin")).toMatchObject({ role: "admin" });
  });

  it("throws FORBIDDEN_ROLE otherwise", () => {
    try {
      requireRole(user("auditee"), "auditor", "verificator");
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError);
      expect(error).toMatchObject({ code: "FORBIDDEN_ROLE", status: 403 });
    }
  });

  it("new 403 codes carry status 403", () => {
    expect(new AuthError("FORBIDDEN_ROLE", "x").status).toBe(403);
    expect(new AuthError("FORBIDDEN_SITE", "x").status).toBe(403);
  });
});

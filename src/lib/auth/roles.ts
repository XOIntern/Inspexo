// Role model for admin provisioning. Server-only (imports DB codec types).
//
// ADMIN is a separate system authorization concept: role === "admin" is the
// ONLY thing that grants provisioning power. Business roles (verificator,
// auditor, auditee) never acquire administrative privileges by construction —
// there is no permission flag any role can gain. Values match the
// user_role_valid CHECK in src/prisma/contract.prisma.

export const ALL_ROLES = ["admin", "verificator", "auditor", "auditee"] as const;
export type Role = (typeof ALL_ROLES)[number];

// Single-admin system (decided Phase 3): provisionUser rejects "admin".
// The first admin is bootstrapped manually; see docs/admin-provisioning.md.
export const ASSIGNABLE_ROLES = ["verificator", "auditor", "auditee"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export type AccountStatus = "active" | "inactive" | "suspended";

// Minimum site assignments per role. Admin is system-level: zero rows.
// AUDITEE "exactly 1" is enforced here in application code — a @@check sees
// one row only, so the schema cannot enforce this cross-row rule.
export const MIN_SITES: Record<AssignableRole, number> = {
  verificator: 1,
  auditor: 1,
  auditee: 1,
};

export const MAX_SITES: Record<AssignableRole, number> = {
  verificator: Number.POSITIVE_INFINITY,
  auditor: Number.POSITIVE_INFINITY,
  auditee: 1,
};

export function isAssignableRole(role: string): role is AssignableRole {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(role);
}

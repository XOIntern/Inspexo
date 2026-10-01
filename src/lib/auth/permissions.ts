// Role → permission map. Server-only, pure (no DB, no I/O).
//
// Permission is CODE, not data: capabilities derive from roles here, where
// review happens. There is deliberately no permissions table — a database
// edit must never grant capability nobody reviewed.
//
// Minimal coarse vocabulary by design (Phase 7): just enough verbs for the
// reusable layer. The HSE domain extends this map when its features land —
// adding a verb is a code change, which is the point. Admin holds system
// permissions ONLY and inherits zero HSE permissions implicitly.

import type { Role } from "./roles";

export const PERMISSIONS = [
  // System (admin only).
  "user.manage",
  "site.assign",
  // Verification.
  "verification.review",
  "verification.verifyClosure",
  // Audit.
  "audit.schedule",
  "audit.conduct",
  "finding.record",
  // Site execution.
  "inspection.daily",
  "inspection.checklist",
  "capa.implement",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: ["user.manage", "site.assign"],
  verificator: ["verification.review", "verification.verifyClosure"],
  auditor: ["audit.schedule", "audit.conduct", "finding.record"],
  auditee: ["inspection.daily", "inspection.checklist", "capa.implement"],
};

/** Fail-closed: unknown roles hold zero permissions. */
export function hasPermission(role: string, permission: Permission): boolean {
  const granted = (ROLE_PERMISSIONS as Record<string, readonly Permission[]>)[role];
  return granted !== undefined && granted.includes(permission);
}

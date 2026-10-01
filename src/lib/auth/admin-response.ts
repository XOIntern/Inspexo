// Shared HTTP plumbing for the admin API plane. Server-only.
//
// Every admin route follows the same shape: requireAdminRequest (401/403)
// → domain call → mapped errors. The ProvisionError→status table lives here
// so the mapping cannot drift between routes.
import { NextRequest, NextResponse } from "next/server";

import { AuthError, ProvisionError, type ProvisionErrorCode } from "./errors";
import { requireRole } from "./authorize";
import { requireRequestUser } from "./session";

const PROVISION_STATUS: Record<ProvisionErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN_NOT_ADMIN: 403,
  ACCOUNT_DISABLED: 403,
  ROLE_NOT_ASSIGNABLE: 422,
  INVALID_INPUT: 422,
  DUPLICATE_EMAIL: 409,
  UNKNOWN_SITE: 422,
  SITE_CARDINALITY: 422,
  USER_NOT_FOUND: 404,
  SELF_DEACTIVATION: 422,
  SELF_ROLE_CHANGE: 422,
};

export function authErrorResponse(error: AuthError): NextResponse {
  return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
}

export function provisionErrorResponse(error: ProvisionError): NextResponse {
  const body: { error: string; code: string; details?: unknown } = {
    error: error.message,
    code: error.code,
  };
  // Field-level detail helps the admin UI highlight inputs; safe audience.
  if (error.code === "INVALID_INPUT" && error.details !== undefined) {
    body.details = error.details;
  }
  return NextResponse.json(body, { status: PROVISION_STATUS[error.code] });
}

/** Never leak internals: one status, one message for the unexpected. */
export function unexpectedErrorResponse(): NextResponse {
  return NextResponse.json({ error: "Internal error." }, { status: 500 });
}

/** Authenticate the request and require the admin role. Throws AuthError. */
export async function requireAdminRequest(req: NextRequest): Promise<{ id: string }> {
  const user = await requireRequestUser(req);
  requireRole(user, "admin");
  return { id: user.id };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

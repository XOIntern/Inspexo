// Canonical current-user response. Server-only.
//
// GET /api/auth/me and GET /api/auth/session are the same endpoint under two
// names: both delegate here, so the safe shape has exactly one code path.
// The shape is an allowlist — id, name, email, role, status, department,
// siteIds, emailVerified, mustChangePassword — and must never gain
// passwordHash, tokens, or verification secrets. Tests assert the exact key
// set so a leak fails the build, not just review.
import { NextRequest, NextResponse } from "next/server";

import { AuthError } from "./errors";
import { clearSessionCookie, requireRequestUser } from "./session";

export const CURRENT_USER_KEYS = [
  "department",
  "email",
  "emailVerified",
  "id",
  "mustChangePassword",
  "name",
  "role",
  "siteIds",
  "status",
] as const;

export async function currentUserResponse(req: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireRequestUser(req);
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        department: user.department,
        siteIds: user.siteIds,
        emailVerified: user.emailVerified,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    const res = NextResponse.json(
      { error: error instanceof AuthError ? error.message : "Authentication required." },
      { status: error instanceof AuthError ? error.status : 401 },
    );
    // A dead session must not linger as a zombie cookie.
    clearSessionCookie(res);
    return res;
  }
}

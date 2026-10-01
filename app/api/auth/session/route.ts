import { NextRequest, NextResponse } from "next/server";

import { AuthError } from "@/src/lib/auth/errors";
import { clearSessionCookie, requireRequestUser } from "@/src/lib/auth/session";

export async function GET(req: NextRequest): Promise<NextResponse> {
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

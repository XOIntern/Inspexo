import { NextRequest, NextResponse } from "next/server";

import { isSameOriginRequest } from "@/src/lib/auth/http";
import {
  clearSessionCookie,
  getSessionCookie,
  logoutToken,
} from "@/src/lib/auth/session";

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  // Idempotent: always 204, with or without a cookie. Revocation kills the
  // session everywhere; clearing the cookie only affects this browser.
  await logoutToken(getSessionCookie(req));
  const res = new NextResponse(null, { status: 204 });
  clearSessionCookie(res);
  return res;
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { changePassword } from "@/src/lib/auth/account";
import { AuthError } from "@/src/lib/auth/errors";
import { isSameOriginRequest } from "@/src/lib/auth/http";
import {
  clearSessionCookie,
  getSessionCookie,
  readSessionToken,
  requireRequestUser,
} from "@/src/lib/auth/session";

const bodySchema = z.object({
  currentPassword: z.string().min(1).max(1024),
  newPassword: z.string().min(12).max(1024),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  let user;
  try {
    user = await requireRequestUser(req);
  } catch (error) {
    const res = NextResponse.json(
      { error: error instanceof AuthError ? error.message : "Authentication required." },
      { status: error instanceof AuthError ? error.status : 401 },
    );
    clearSessionCookie(res);
    return res;
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }
  try {
    // Spare the calling session; revoke everything else.
    let sparedJti: string | null = null;
    try {
      sparedJti = (await readSessionToken(getSessionCookie(req) ?? "")).jti;
    } catch {
      sparedJti = null;
    }
    const result = await changePassword(user.id, sparedJti, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Unable to change password." }, { status: 500 });
  }
}

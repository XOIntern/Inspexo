import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AuthError } from "@/src/lib/auth/errors";
import { isSameOriginRequest } from "@/src/lib/auth/http";
import {
  authenticate,
  clearSessionCookie,
  createSession,
  setSessionCookie,
} from "@/src/lib/auth/session";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(255)),
  password: z.string().min(1).max(1024),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }
  try {
    const user = await authenticate(parsed.data.email, parsed.data.password);
    const { token } = await createSession(user.id);
    const res = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        department: user.department,
        siteIds: user.siteIds,
      },
      emailVerified: user.emailVerified,
      mustChangePassword: user.mustChangePassword,
    });
    setSessionCookie(res, token);
    return res;
  } catch (error) {
    if (error instanceof AuthError && error.code === "RATE_LIMITED") {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    // Every credential/status failure collapses here: one status, one message.
    const res = NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    // A failed login must never leave a session cookie behind.
    clearSessionCookie(res);
    return res;
  }
}

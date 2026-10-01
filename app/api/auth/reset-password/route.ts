import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { VerificationError } from "@/src/lib/auth/errors";
import { isSameOriginRequest } from "@/src/lib/auth/http";
import { confirmPasswordReset } from "@/src/lib/auth/password-reset";

const resetSchema = z.object({
  token: z.string().min(1).max(256),
  newPassword: z.string().min(12).max(1024),
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
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }
  try {
    await confirmPasswordReset(parsed.data.token, parsed.data.newPassword);
    return NextResponse.json({ reset: true });
  } catch (error) {
    if (error instanceof VerificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
  }
}

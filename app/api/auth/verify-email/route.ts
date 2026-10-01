import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { VerificationError } from "@/src/lib/auth/errors";
import { isSameOriginRequest } from "@/src/lib/auth/http";
import { consumeVerificationToken } from "@/src/lib/auth/verification";

const verifySchema = z.object({
  token: z.string().min(1).max(256),
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
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }
  try {
    await consumeVerificationToken(parsed.data.token, {
      clientIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
    });
    return NextResponse.json({ verified: true });
  } catch (error) {
    if (error instanceof VerificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Invalid or expired verification link." }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isSameOriginRequest } from "@/src/lib/auth/http";
import { getMailer } from "@/src/lib/auth/mailer";
import { requestPasswordReset } from "@/src/lib/auth/password-reset";

const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(255)),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    // Same 202: body shape reveals nothing about any account.
    return NextResponse.json({ sent: true }, { status: 202 });
  }
  const parsed = forgotSchema.safeParse(body);
  try {
    await requestPasswordReset(
      parsed.success ? parsed.data.email : null,
      getMailer(),
      new URL(req.url).origin,
    );
  } catch {
    // Mail transport failures included: always 202, never an oracle.
  }
  return NextResponse.json({ sent: true }, { status: 202 });
}

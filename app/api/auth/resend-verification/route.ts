import { NextRequest, NextResponse } from "next/server";

import { AuthError, VerificationError } from "@/src/lib/auth/errors";
import { isSameOriginRequest } from "@/src/lib/auth/http";
import { getMailer } from "@/src/lib/auth/mailer";
import { requireRequestUser } from "@/src/lib/auth/session";
import { requestVerificationResend } from "@/src/lib/auth/verification";

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  let user;
  try {
    user = await requireRequestUser(req);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof AuthError ? error.message : "Authentication required." },
      { status: error instanceof AuthError ? error.status : 401 },
    );
  }
  try {
    const result = await requestVerificationResend(
      user,
      getMailer(),
      new URL(req.url).origin,
    );
    if (result.alreadyVerified) {
      return NextResponse.json({ verified: true, sent: false });
    }
    return NextResponse.json({ verified: false, sent: true });
  } catch (error) {
    if (error instanceof VerificationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    // Includes mail-transport failures: generic, no provider details leak.
    return NextResponse.json({ error: "Unable to send verification email." }, { status: 502 });
  }
}

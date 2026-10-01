import { NextRequest, NextResponse } from "next/server";

import {
  authErrorResponse,
  isUuid,
  provisionErrorResponse,
  requireAdminRequest,
  unexpectedErrorResponse,
} from "@/src/lib/auth/admin-response";
import { AuthError, ProvisionError } from "@/src/lib/auth/errors";
import { getUserDetails } from "@/src/lib/auth/admin-queries";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    await requireAdminRequest(req);
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return unexpectedErrorResponse();
  }
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 422 });
  }
  try {
    return NextResponse.json({ user: await getUserDetails(id) });
  } catch (error) {
    if (error instanceof ProvisionError) return provisionErrorResponse(error);
    return unexpectedErrorResponse();
  }
}

import { NextRequest, NextResponse } from "next/server";

import {
  authErrorResponse,
  provisionErrorResponse,
  requireAdminRequest,
  unexpectedErrorResponse,
} from "@/src/lib/auth/admin-response";
import { isSameOriginRequest } from "@/src/lib/auth/http";
import { AuthError, ProvisionError } from "@/src/lib/auth/errors";
import { generateUserCredentials } from "@/src/lib/auth/bulk";

// POST /api/admin/users/credentials — batch credential generation.
// The response IS the export: secrets appear here once and nowhere else.
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  let admin;
  try {
    admin = await requireAdminRequest(req);
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return unexpectedErrorResponse();
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }
  try {
    const result = await generateUserCredentials(
      admin.id,
      (body as { userIds?: unknown } | null)?.userIds,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ProvisionError) return provisionErrorResponse(error);
    return unexpectedErrorResponse();
  }
}

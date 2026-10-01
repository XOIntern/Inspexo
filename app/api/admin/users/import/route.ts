import { NextRequest, NextResponse } from "next/server";

import {
  authErrorResponse,
  provisionErrorResponse,
  requireAdminRequest,
  unexpectedErrorResponse,
} from "@/src/lib/auth/admin-response";
import { isSameOriginRequest } from "@/src/lib/auth/http";
import { AuthError, ProvisionError } from "@/src/lib/auth/errors";
import { importUsers } from "@/src/lib/auth/bulk";

// POST /api/admin/users/import — bulk create without credentials.
// The UI parses Excel client-side and sends JSON rows.
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
    const result = await importUsers(
      admin.id,
      (body as { users?: unknown } | null)?.users,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ProvisionError) return provisionErrorResponse(error);
    return unexpectedErrorResponse();
  }
}

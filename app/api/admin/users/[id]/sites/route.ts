import { NextRequest, NextResponse } from "next/server";

import {
  authErrorResponse,
  isUuid,
  provisionErrorResponse,
  requireAdminRequest,
  unexpectedErrorResponse,
} from "@/src/lib/auth/admin-response";
import { isSameOriginRequest } from "@/src/lib/auth/http";
import { AuthError, ProvisionError } from "@/src/lib/auth/errors";
import { updateUserSites } from "@/src/lib/auth/admin";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
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
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid user id." }, { status: 422 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }
  try {
    const result = await updateUserSites(
      admin.id,
      id,
      (body as { siteIds?: unknown } | null)?.siteIds,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ProvisionError) return provisionErrorResponse(error);
    return unexpectedErrorResponse();
  }
}

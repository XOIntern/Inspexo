import { NextRequest, NextResponse } from "next/server";

import {
  authErrorResponse,
  requireAdminRequest,
  unexpectedErrorResponse,
} from "@/src/lib/auth/admin-response";
import { AuthError } from "@/src/lib/auth/errors";
import { listSites } from "@/src/lib/auth/admin-queries";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAdminRequest(req);
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return unexpectedErrorResponse();
  }
  try {
    return NextResponse.json({ sites: await listSites() });
  } catch {
    return unexpectedErrorResponse();
  }
}

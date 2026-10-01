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
import { listUsers } from "@/src/lib/auth/admin-queries";
import { provisionUser } from "@/src/lib/auth/provision";

const KNOWN_ROLES = ["admin", "verificator", "auditor", "auditee"];
const KNOWN_STATUSES = ["active", "inactive", "suspended"];

// GET /api/admin/users?search=&role=&status=&siteId=&page=&pageSize=
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAdminRequest(req);
  } catch (error) {
    if (error instanceof AuthError) return authErrorResponse(error);
    return unexpectedErrorResponse();
  }
  const params = req.nextUrl.searchParams;
  const rawPage = params.get("page");
  const rawPageSize = params.get("pageSize");
  const page = rawPage === null ? undefined : Number(rawPage);
  const pageSize = rawPageSize === null ? undefined : Number(rawPageSize);
  if (
    (rawPage !== null && !Number.isFinite(page)) ||
    (rawPageSize !== null && !Number.isFinite(pageSize))
  ) {
    return NextResponse.json({ error: "Invalid pagination." }, { status: 422 });
  }
  const role = params.get("role") ?? undefined;
  const status = params.get("status") ?? undefined;
  const siteId = params.get("siteId") ?? undefined;
  if (role !== undefined && !KNOWN_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role filter." }, { status: 422 });
  }
  if (status !== undefined && !KNOWN_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status filter." }, { status: 422 });
  }
  if (siteId !== undefined && !isUuid(siteId)) {
    return NextResponse.json({ error: "Invalid site filter." }, { status: 422 });
  }
  try {
    const result = await listUsers({
      search: params.get("search") ?? undefined,
      role,
      status,
      siteId,
      page,
      pageSize,
    });
    return NextResponse.json(result);
  } catch {
    return unexpectedErrorResponse();
  }
}

// POST /api/admin/users — single provision, temp password returned once.
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
    const result = await provisionUser(admin.id, body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ProvisionError) return provisionErrorResponse(error);
    return unexpectedErrorResponse();
  }
}

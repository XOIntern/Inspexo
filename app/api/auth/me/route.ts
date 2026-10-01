import { NextRequest, NextResponse } from "next/server";

import { currentUserResponse } from "@/src/lib/auth/current-user";

export async function GET(req: NextRequest): Promise<NextResponse> {
  return currentUserResponse(req);
}

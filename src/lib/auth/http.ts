// Shared route-handler helpers. Server-only (no component imports).
import { NextRequest } from "next/server";

/**
 * SameSite=Lax already blocks cross-site POST; defence in depth: a mutating
 * request must prove same-origin via Origin, or declare itself via
 * Sec-Fetch-Site. No CSRF token needed — stated explicitly, not assumed.
 */
export function isSameOriginRequest(req: NextRequest): boolean {
  const host = new URL(req.url).host;
  const origin = req.headers.get("origin");
  if (origin !== null) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  const site = req.headers.get("sec-fetch-site");
  return site === "same-origin";
}

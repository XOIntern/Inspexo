// Cookie-based current user for Server Components and Server Actions.
// Server-only (next/headers cannot be imported from client components).
//
// Kept in its own module so request-scoped code (routes, which build a
// NextRequest) never pulls next/headers into unit-testable layers:
// authorize.ts and provision.ts stay importable under plain node.
import { cookies } from "next/headers";

import { AuthError } from "./errors";
import {
  GENERIC_SESSION_MESSAGE,
  SESSION_COOKIE_NAME,
  validateSessionToken,
  type PublicUser,
} from "./session";

/**
 * Authenticate the current request's cookie. Missing/garbage/expired/
 * revoked sessions → 401; valid session on a deactivated account → 403.
 * Use at the top of any server component or action that needs a user —
 * never trust a user object from client input.
 */
export async function requireUser(): Promise<PublicUser> {
  let token: string | null = null;
  try {
    token = (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null;
  } catch {
    token = null;
  }
  if (token === null) {
    throw new AuthError("SESSION_INVALID", GENERIC_SESSION_MESSAGE);
  }
  return validateSessionToken(token);
}

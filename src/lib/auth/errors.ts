// Typed provisioning and authentication errors. Codes map to HTTP statuses in
// routes; tests assert them directly.
// Within AUTHENTICATION, everything collapses to one message. The 403 codes
// are all post-authentication (caller identity proven), so specificity is safe.

export const PROVISION_ERROR_CODES = [
  "UNAUTHENTICATED", // no caller — maps to 401 generic
  "FORBIDDEN_NOT_ADMIN", // caller role is not admin — maps to 403
  "ACCOUNT_DISABLED", // admin caller is not active — maps to 403
  "ROLE_NOT_ASSIGNABLE", // "admin" or unknown role — maps to 422
  "INVALID_INPUT", // zod validation failure — maps to 422
  "DUPLICATE_EMAIL", // incl. case-variant — maps to 409, generic message
  "UNKNOWN_SITE", // siteId does not exist — maps to 422
  "SITE_CARDINALITY", // violates MIN/MAX_SITES for the role — maps to 422
] as const;

export type ProvisionErrorCode = (typeof PROVISION_ERROR_CODES)[number];

export class ProvisionError extends Error {
  readonly code: ProvisionErrorCode;
  readonly details?: unknown;

  constructor(code: ProvisionErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ProvisionError";
    this.code = code;
    this.details = details;
  }
}

export const AUTH_ERROR_CODES = [
  "INVALID_CREDENTIALS", // unknown email, wrong password, inactive, null hash — 401 generic
  "SESSION_INVALID", // undecryptable, expired, missing/revoked row — 401 generic
  "ACCOUNT_DISABLED", // valid session, account deactivated — 403 (identity proven)
  "RATE_LIMITED", // throttle exhausted — 429
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

const AUTH_ERROR_STATUS: Record<AuthErrorCode, 401 | 403 | 429> = {
  INVALID_CREDENTIALS: 401,
  SESSION_INVALID: 401,
  ACCOUNT_DISABLED: 403,
  RATE_LIMITED: 429,
};

/** Authentication/session failure. Messages are safe to send to clients. */
export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly status: 401 | 403 | 429;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = AUTH_ERROR_STATUS[code];
  }
}

// Typed provisioning errors. Codes map to HTTP statuses when a route exists
// (Phase 4+); until then they are asserted directly in tests.
// Within AUTHENTICATION, everything collapses to one message. These codes are
// all post-authentication (caller identity proven), so specificity is safe.

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

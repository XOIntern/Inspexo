// Fail-fast environment parsing for auth. Server-only.
//
// Validates presence and format only — values are never logged. Called at
// session-key use time (first login), so a bad key fails loudly at boot of
// the auth path instead of decrypting to garbage mid-request.

const PASERK_V3_LOCAL_RE = /^k3\.local\.[A-Za-z0-9_-]{43}$/; // 52 chars total

export function getSessionKeyPaserk(): string {
  const value = process.env["PASETO_SESSION_KEY"];
  if (!value || !PASERK_V3_LOCAL_RE.test(value)) {
    throw new Error(
      "PASETO_SESSION_KEY must be a v3.local PASERK string (k3.local.… — 52 chars). " +
        "Generate one for development only; see docs/admin-provisioning.md.",
    );
  }
  return value;
}

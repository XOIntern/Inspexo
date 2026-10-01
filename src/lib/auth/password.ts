// Argon2id password hashing + temporary-password generation. Server-only.
//
// Parameters follow the Phase 1 decision (memory 19 MiB, t=2, p=1); the exact
// OWASP figures should be re-confirmed against current guidance before the
// login phase tunes verification/rehash policy. Encoded hashes are 97 chars,
// fitting User.passwordHash VarChar(255).
//
// No plaintext password is ever stored or logged — only the PHC string, which
// carries its own salt and parameters.

import { randomBytes } from "node:crypto";
import { hash as argonHash } from "@node-rs/argon2";

export const ARGON2_MEMORY_COST = 19456; // KiB (19 MiB)
export const ARGON2_TIME_COST = 2;
export const ARGON2_PARALLELISM = 1;

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 1024; // unbounded input is a free CPU-burn vector

// 15 bytes -> 20 base64url chars (~120 bits). No padding: 15 is a multiple of 3,
// and base64url is safe to relay out-of-band (email, chat, paper).
export const TEMP_PASSWORD_BYTES = 15;
export const TEMP_PASSWORD_LENGTH = 20;

export function generateTempPassword(): string {
  return randomBytes(TEMP_PASSWORD_BYTES).toString("base64url");
}

export async function hashPassword(password: string): Promise<string> {
  return argonHash(password, {
    memoryCost: ARGON2_MEMORY_COST,
    timeCost: ARGON2_TIME_COST,
    parallelism: ARGON2_PARALLELISM,
  });
}

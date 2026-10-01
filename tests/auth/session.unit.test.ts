// Unit tests for PASETO session tokens and env parsing: no database.
// A throwaway key is generated per run and injected via process.env;
// the dev key in .env is restored afterwards.
import { LocalProtocol } from "paseto";
import {
  DecryptFactory,
  EncryptFactory,
  ExportKeyFactory,
  GenerateKeyFactory,
  ImportKeyFactory,
} from "paseto/v3/local";
import { beforeAll, describe, expect, it } from "vitest";

import { getSessionKeyPaserk } from "@/src/lib/auth/env";
import { AuthError } from "@/src/lib/auth/errors";
import {
  SESSION_AUDIENCE,
  SESSION_ISSUER,
  issueSessionToken,
  readSessionToken,
} from "@/src/lib/auth/session";

const previousKey = process.env["PASETO_SESSION_KEY"];
let testPaserk = "";

beforeAll(async () => {
  const v3 = new LocalProtocol(GenerateKeyFactory, ExportKeyFactory);
  testPaserk = await v3.ExportKey(await v3.GenerateKey({ extractable: true }));
  process.env["PASETO_SESSION_KEY"] = testPaserk;
  return () => {
    if (previousKey === undefined) delete process.env["PASETO_SESSION_KEY"];
    else process.env["PASETO_SESSION_KEY"] = previousKey;
  };
});

async function encryptWith(keyPaserk: string, claims: object, expiresIn = 28800): Promise<string> {
  const v3 = new LocalProtocol(EncryptFactory, ImportKeyFactory);
  const key = await v3.ImportKey(keyPaserk as `k3.local.${string}`);
  return v3.Encrypt(key, claims, { expiresIn });
}

describe("getSessionKeyPaserk", () => {
  it("accepts a 52-char k3.local PASERK", () => {
    expect(getSessionKeyPaserk()).toBe(testPaserk);
    expect(testPaserk).toHaveLength(52);
  });

  it("rejects missing, truncated, and wrong-version keys", () => {
    const saved = process.env["PASETO_SESSION_KEY"];
    try {
      delete process.env["PASETO_SESSION_KEY"];
      expect(() => getSessionKeyPaserk()).toThrow();
      process.env["PASETO_SESSION_KEY"] = "k3.local.SHORT";
      expect(() => getSessionKeyPaserk()).toThrow();
      process.env["PASETO_SESSION_KEY"] = `k4.local.${"A".repeat(43)}`;
      expect(() => getSessionKeyPaserk()).toThrow();
      process.env["PASETO_SESSION_KEY"] = "not-a-key";
      expect(() => getSessionKeyPaserk()).toThrow();
    } finally {
      process.env["PASETO_SESSION_KEY"] = saved;
    }
  });
});

describe("session tokens", () => {
  it("round-trips userId and jti with aud/iss claims", async () => {
    const token = await issueSessionToken("user-123", "sess-456");
    expect(token.startsWith("v3.local.")).toBe(true);
    expect(await readSessionToken(token)).toEqual({ userId: "user-123", jti: "sess-456" });
  });

  it("rejects tampered tokens", async () => {
    const token = await issueSessionToken("u", "j");
    await expect(readSessionToken(`${token.slice(0, -2)}xx`)).rejects.toMatchObject({
      name: "AuthError",
      code: "SESSION_INVALID",
    });
  });

  it("rejects garbage", async () => {
    await expect(readSessionToken("not-a-token")).rejects.toBeInstanceOf(AuthError);
  });

  it("rejects tokens sealed with a different key", async () => {
    const v3 = new LocalProtocol(GenerateKeyFactory, ExportKeyFactory);
    const other = await v3.ExportKey(await v3.GenerateKey({ extractable: true }));
    const token = await encryptWith(other, {
      sub: "u",
      jti: "j",
      aud: SESSION_AUDIENCE,
      iss: SESSION_ISSUER,
    });
    await expect(readSessionToken(token)).rejects.toMatchObject({ code: "SESSION_INVALID" });
  });

  it("rejects wrong audience and missing subject", async () => {
    const badAud = await encryptWith(testPaserk, {
      sub: "u",
      jti: "j",
      aud: "other-app",
      iss: SESSION_ISSUER,
    });
    await expect(readSessionToken(badAud)).rejects.toMatchObject({ code: "SESSION_INVALID" });

    const noSub = await encryptWith(testPaserk, { jti: "j", aud: SESSION_AUDIENCE });
    await expect(readSessionToken(noSub)).rejects.toMatchObject({ code: "SESSION_INVALID" });
  });

  it("rejects expired tokens", async () => {
    const token = await encryptWith(
      testPaserk,
      { sub: "u", jti: "j", aud: SESSION_AUDIENCE, iss: SESSION_ISSUER },
      1,
    );
    await new Promise((r) => setTimeout(r, 1100));
    await expect(readSessionToken(token)).rejects.toMatchObject({ code: "SESSION_INVALID" });
  });

  it("AuthError carries the right status per code", () => {
    expect(new AuthError("SESSION_INVALID", "x").status).toBe(401);
    expect(new AuthError("INVALID_CREDENTIALS", "x").status).toBe(401);
    expect(new AuthError("ACCOUNT_DISABLED", "x").status).toBe(403);
    expect(new AuthError("RATE_LIMITED", "x").status).toBe(429);
  });
});

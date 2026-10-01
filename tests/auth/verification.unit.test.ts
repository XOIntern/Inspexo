// Unit tests for verification tokens and the mailer boundary: no database.
import { describe, expect, it } from "vitest";

import type { Mailer } from "@/src/lib/auth/mailer";
import {
  VERIFY_PAGE_PATH,
  buildVerificationLink,
  generateRawToken,
  hashToken,
} from "@/src/lib/auth/verification";

describe("tokens", () => {
  it("are 43 url-safe chars and unique per call", () => {
    const a = generateRawToken();
    const b = generateRawToken();
    expect(a).toHaveLength(43);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a).not.toBe(b);
  });

  it("hash deterministically to 64 lowercase hex", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });
});

describe("verification link", () => {
  it("points at the future verify page with the token as query param", () => {
    const link = buildVerificationLink("http://localhost:3000/", "RAWTOKEN");
    expect(link).toBe(`http://localhost:3000${VERIFY_PAGE_PATH}?token=RAWTOKEN`);
  });
});

describe("mailer boundary", () => {
  it("domain codes against the interface, not the transport", async () => {
    const sent: Array<{ to: string; link: string }> = [];
    const fake: Mailer = {
      sendVerificationEmail: async (email) => {
        sent.push(email);
        return { id: "fake-id" };
      },
    };
    const result = await fake.sendVerificationEmail({
      to: "sari@inspexo.id",
      link: buildVerificationLink("http://x", generateRawToken()),
    });
    expect(result).toEqual({ id: "fake-id" });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe("sari@inspexo.id");
    expect(sent[0]!.link).toContain("token=");
  });
});

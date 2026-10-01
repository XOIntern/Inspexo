// Outbound mail boundary. Server-only.
//
// The verification domain codes against the Mailer interface — swapping the
// transport (verified custom domain, different provider) never touches
// verification logic. The production transport is Resend; there is no dev
// file log by decision (Phase 6): links leave through the real API only.
// RESEND_API_KEY lives in server env, is read lazily at send time, and is
// never logged or exposed to the client.
import { Resend } from "resend";

export type VerificationEmail = {
  to: string;
  link: string;
};

export type SentEmail = {
  id: string;
};

export interface Mailer {
  sendVerificationEmail(email: VerificationEmail): Promise<SentEmail>;
}

/** Resend's onboarding sender — delivers to the Resend account's own email
 *  only, until a custom domain is verified. API failures surface loudly. */
export const VERIFICATION_SENDER = "InspeXO <onboarding@resend.dev>";

export class ResendMailer implements Mailer {
  async sendVerificationEmail({ to, link }: VerificationEmail): Promise<SentEmail> {
    const apiKey = process.env["RESEND_API_KEY"];
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured.");
    }
    const resend = new Resend(apiKey);
    // A hung provider must not hang the route: race the send against a
    // 10 s timeout (the SDK's options carry no abort signal).
    const send = resend.emails.send({
      from: VERIFICATION_SENDER,
      to,
      subject: "Verify your InspeXO email address",
      text: `Verify your email address by opening this link (valid 24 hours, single use):\n\n${link}\n\nIf you did not expect this email, ignore it.`,
    });
    const { data, error } = await Promise.race([
      send,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Verification email timed out.")), 10_000),
      ),
    ]);
    if (error || !data) {
      throw new Error(`Verification email was not accepted: ${error?.message ?? "unknown error"}.`);
    }
    return { id: data.id };
  }
}

let defaultMailer: Mailer | null = null;

/** Process-wide mailer. No caching of secrets — the key is read per send. */
export function getMailer(): Mailer {
  if (defaultMailer === null) {
    defaultMailer = new ResendMailer();
  }
  return defaultMailer;
}

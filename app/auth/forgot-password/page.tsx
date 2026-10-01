"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);

    // TODO: Replace with actual password reset API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsLoading(false);
    setIsSubmitted(true);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="relative min-h-screen">
        {/* Background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(189,220,198,0.42),transparent_32%),radial-gradient(circle_at_85%_85%,rgba(214,229,216,0.46),transparent_30%)]"
        />

        <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl lg:grid-cols-[1.08fr_0.92fr]">
          {/* =========================
              DESKTOP BRAND PANEL
          ========================== */}
          <section className="relative hidden overflow-hidden px-10 py-10 lg:flex lg:flex-col lg:justify-between lg:px-12 xl:px-16">
            <div>
              {/* Logo */}
              <Link
                href="/"
                aria-label="InspeXO home"
                className="inline-flex items-center gap-2.5"
              >
                <div className="relative size-11">
                  <Image
                    src="/logoXO.webp"
                    alt=""
                    fill
                    sizes="44px"
                    priority
                    className="object-contain"
                  />
                </div>

                <div className="relative h-9 w-[126px]">
                  <Image
                    src="/InspeXO.webp"
                    alt="InspeXO"
                    fill
                    sizes="126px"
                    priority
                    className="object-contain object-left"
                  />
                </div>
              </Link>

              {/* Hero text */}
              <div className="mt-24 max-w-xl">
                <p className="text-xs font-semibold tracking-[0.18em] text-ring">
                  ACCOUNT RECOVERY
                </p>

                <h1 className="mt-5 max-w-[12ch] text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.065em] text-foreground xl:text-6xl">
                  Recover your account access.
                </h1>

                <p className="mt-6 max-w-lg text-base leading-8 text-muted-foreground">
                  Enter your corporate email to receive a password reset link.
                  Your account security is our priority.
                </p>
              </div>
            </div>

            {/* Feature cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: Mail,
                  title: "Email verification",
                  text: "Reset link is sent only to your registered email.",
                },
                {
                  icon: KeyRound,
                  title: "Secure reset",
                  text: "Links expire after a limited time for safety.",
                },
                {
                  icon: ShieldCheck,
                  title: "Identity protected",
                  text: "Your credentials are never shared or exposed.",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-border bg-white/65 p-4 backdrop-blur-md"
                  >
                    <Icon className="size-4 text-brand" />

                    <p className="mt-3 text-sm font-semibold text-accent-foreground">
                      {item.title}
                    </p>

                    <p className="mt-1.5 text-xs leading-5 text-muted-foreground/80">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* =========================
              FORGOT PASSWORD SECTION
          ========================== */}
          <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
            <div className="w-full max-w-md">
              {/* Mobile logo */}
              <div className="mb-8 flex justify-center lg:hidden">
                <Link
                  href="/"
                  aria-label="InspeXO home"
                  className="inline-flex items-center gap-2.5"
                >
                  <div className="relative size-10">
                    <Image
                      src="/logoXO.webp"
                      alt=""
                      fill
                      sizes="40px"
                      priority
                      className="object-contain"
                    />
                  </div>

                  <div className="relative h-8 w-[112px]">
                    <Image
                      src="/InspeXO.webp"
                      alt="InspeXO"
                      fill
                      sizes="112px"
                      priority
                      className="object-contain object-left"
                    />
                  </div>
                </Link>
              </div>

              {/* Card */}
              <div className="rounded-3xl border border-border bg-white/85 shadow-[0_24px_70px_rgba(38,59,43,0.10)] backdrop-blur-xl">
                {!isSubmitted ? (
                  <>
                    {/* Header */}
                    <div className="space-y-2 p-6 pb-4 sm:p-8 sm:pb-5">
                      <div className="inline-flex w-fit rounded-full border border-border bg-accent/60 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-ring">
                        PASSWORD RECOVERY
                      </div>

                      <h2 className="pt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">
                        Forgot your password?
                      </h2>

                      <p className="text-sm leading-6 text-muted-foreground">
                        Enter the email address associated with your corporate
                        account and we&apos;ll send you a link to reset your
                        password.
                      </p>
                    </div>

                    {/* Content */}
                    <div className="p-6 pt-2 sm:p-8 sm:pt-3">
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Corporate email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            className="h-12 rounded-xl px-4"
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={isLoading || !email.trim()}
                          className="h-12 w-full rounded-full text-sm font-semibold"
                        >
                          {isLoading ? "Sending reset link…" : "Send reset link"}
                        </Button>
                      </form>

                      {/* Divider */}
                      <div className="my-6 flex items-center gap-3">
                        <div className="h-px flex-1 bg-border" />

                        <span className="text-[11px] font-medium text-muted-foreground/80">
                          NEED HELP?
                        </span>

                        <div className="h-px flex-1 bg-border" />
                      </div>

                      {/* Info box */}
                      <div className="rounded-2xl border border-border bg-card p-4">
                        <p className="text-sm font-semibold text-accent-foreground">
                          Can&apos;t access your email?
                        </p>

                        <p className="mt-1.5 text-xs leading-5 text-muted-foreground/80">
                          If you no longer have access to your registered email
                          address, please contact your IT administrator or the
                          HSE system administrator for assistance.
                        </p>
                      </div>

                      {/* Security note */}
                      <p className="mt-6 text-center text-[11px] leading-5 text-muted-foreground/80">
                        For your security, password reset links expire after 60
                        minutes. Only one active link can exist at a time.
                      </p>
                    </div>
                  </>
                ) : (
                  /* ========================
                     SUCCESS STATE
                  ======================== */
                  <div className="p-6 sm:p-8">
                    <div className="flex flex-col items-center text-center">
                      {/* Success icon */}
                      <div className="flex size-14 items-center justify-center rounded-full border border-border bg-accent/60">
                        <Mail className="size-6 text-brand" />
                      </div>

                      <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">
                        Check your email
                      </h2>

                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        We&apos;ve sent a password reset link to{" "}
                        <span className="font-semibold text-foreground">
                          {email}
                        </span>
                        . Please check your inbox and follow the instructions.
                      </p>

                      {/* Info box */}
                      <div className="mt-6 w-full rounded-2xl border border-border bg-card p-4 text-left">
                        <p className="text-sm font-semibold text-accent-foreground">
                          Didn&apos;t receive the email?
                        </p>

                        <ul className="mt-2 space-y-1.5 text-xs leading-5 text-muted-foreground/80">
                          <li>• Check your spam or junk folder</li>
                          <li>• Make sure you entered the correct email</li>
                          <li>• Wait a few minutes and try again</li>
                        </ul>
                      </div>

                      {/* Resend button */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsSubmitted(false);
                          setEmail("");
                        }}
                        className="mt-5 h-10 rounded-full px-6 text-sm font-semibold"
                      >
                        Try a different email
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Back to login */}
              <div className="mt-5 flex flex-col items-center gap-3">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" />
                  Back to login
                </Link>

                {/* Footer */}
                <p className="text-[11px] text-muted-foreground/80">
                  © {new Date().getFullYear()} InspeXO · HSE Management System
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

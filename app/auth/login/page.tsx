"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type LoginPageProps = {
  onMicrosoftLogin?: () => void;
};

export default function LoginPage({ onMicrosoftLogin }: LoginPageProps) {
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
                  HSE MANAGEMENT SYSTEM
                </p>

                <h1 className="mt-5 max-w-[10ch] text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.065em] text-foreground xl:text-6xl">
                  One workspace for safer operations.
                </h1>

                <p className="mt-6 max-w-lg text-base leading-8 text-muted-foreground">
                  Manage audits, checklists, inspections, findings, and
                  corrective actions in one centralized workspace.
                </p>
              </div>
            </div>

            {/* Feature cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: ShieldCheck,
                  title: "Controlled access",
                  text: "Permissions follow your assigned site and role.",
                },
                {
                  icon: Building2,
                  title: "Site-aware",
                  text: "Access is resolved for your operational context.",
                },
                {
                  icon: ArrowRight,
                  title: "Ready to act",
                  text: "Continue directly to your prioritized tasks.",
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
              LOGIN SECTION
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

              {/* Login card */}
              <div className="rounded-3xl border border-border bg-white/85 shadow-[0_24px_70px_rgba(38,59,43,0.10)] backdrop-blur-xl">
                {/* Header */}
                <div className="space-y-2 p-6 pb-4 sm:p-8 sm:pb-5">
                  <div className="inline-flex w-fit rounded-full border border-border bg-accent/60 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-ring">
                    SECURE ACCESS
                  </div>

                  <h2 className="pt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">
                    Welcome to InspeXO
                  </h2>

                  <p className="text-sm leading-6 text-muted-foreground">
                    Sign in with your Microsoft corporate account to access the
                    HSE Management System.
                  </p>
                </div>

                {/* Content */}
                <div className="p-6 pt-2 sm:p-8 sm:pt-3">
                  {/* Microsoft Login */}
                  <Button
                    type="button"
                    onClick={onMicrosoftLogin}
                    disabled={!onMicrosoftLogin}
                    className="h-12 w-full rounded-full text-sm font-semibold"
                  >
                    Continue with Microsoft
                  </Button>

                  {!onMicrosoftLogin && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Microsoft Entra ID login is not configured yet.
                    </p>
                  )}

                  {/* Divider */}
                  <div className="my-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />

                    <span className="text-[11px] font-medium text-muted-foreground/80">
                      CORPORATE ACCESS
                    </span>

                    <div className="h-px flex-1 bg-border" />
                  </div>

                  {/* Role explanation */}
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-accent-foreground">
                      Your role and site access are automatic
                    </p>

                    <p className="mt-1.5 text-xs leading-5 text-muted-foreground/80">
                      After authentication, InspeXO resolves your assigned role
                      and operational site permissions. No role selection is
                      required on this screen.
                    </p>
                  </div>

                  {/* Role pills */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {["Auditor", "Auditee", "Verificator"].map((role) => (
                      <span
                        key={role}
                        className="rounded-full border border-border bg-white px-3 py-1.5 text-[11px] font-medium text-muted-foreground"
                      >
                        {role}
                      </span>
                    ))}
                  </div>

                  {/* Security note */}
                  <p className="mt-6 text-center text-[11px] leading-5 text-muted-foreground/80">
                    Access is restricted to authenticated corporate users. Your
                    permissions are evaluated according to the assigned
                    user-site-role mapping.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <p className="mt-5 text-center text-[11px] text-muted-foreground/80">
                © {new Date().getFullYear()} InspeXO · HSE Management System
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

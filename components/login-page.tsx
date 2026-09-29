"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";

type LoginPageProps = {
  onMicrosoftLogin?: () => void;
};

// function MicrosoftLogo() {
//   return (
//     <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0">
//       <rect x="2" y="2" width="9" height="9" fill="currentColor" />
//       <rect
//         x="13"
//         y="2"
//         width="9"
//         height="9"
//         fill="currentColor"
//         opacity="0.82"
//       />
//       <rect
//         x="2"
//         y="13"
//         width="9"
//         height="9"
//         fill="currentColor"
//         opacity="0.82"
//       />
//       <rect x="13" y="13" width="9" height="9" fill="currentColor" />
//     </svg>
//   );
// }

export default function LoginPage({ onMicrosoftLogin }: LoginPageProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8f5] text-[#19231f]">
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
                    priority
                    className="object-contain"
                  />
                </div>

                <div className="relative h-9 w-[126px]">
                  <Image
                    src="/InspeXO.webp"
                    alt="InspeXO"
                    fill
                    priority
                    className="object-contain object-left"
                  />
                </div>
              </Link>

              {/* Hero text */}
              <div className="mt-24 max-w-xl">
                <p className="text-xs font-semibold tracking-[0.18em] text-[#568061]">
                  HSE MANAGEMENT SYSTEM
                </p>

                <h1 className="mt-5 max-w-[10ch] text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.065em] text-[#17231d] xl:text-6xl">
                  One workspace for safer operations.
                </h1>

                <p className="mt-6 max-w-lg text-base leading-8 text-[#68746d]">
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
                    className="rounded-2xl border border-[#dfe7df] bg-white/65 p-4 backdrop-blur-md"
                  >
                    <Icon className="size-4 text-[#4f8560]" />

                    <p className="mt-3 text-sm font-semibold text-[#2f4337]">
                      {item.title}
                    </p>

                    <p className="mt-1.5 text-xs leading-5 text-[#728078]">
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
                      priority
                      className="object-contain"
                    />
                  </div>

                  <div className="relative h-8 w-[112px]">
                    <Image
                      src="/InspeXO.webp"
                      alt="InspeXO"
                      fill
                      priority
                      className="object-contain object-left"
                    />
                  </div>
                </Link>
              </div>

              {/* Login card */}
              <div className="rounded-3xl border border-[#dfe7df] bg-white/85 shadow-[0_24px_70px_rgba(38,59,43,0.10)] backdrop-blur-xl">
                {/* Header */}
                <div className="space-y-2 p-6 pb-4 sm:p-8 sm:pb-5">
                  <div className="inline-flex w-fit rounded-full border border-[#dfe9df] bg-[#f3f8f3] px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-[#568061]">
                    SECURE ACCESS
                  </div>

                  <h2 className="pt-2 text-2xl font-semibold tracking-[-0.04em] text-[#17231d] sm:text-3xl">
                    Welcome to InspeXO
                  </h2>

                  <p className="text-sm leading-6 text-[#68746d]">
                    Sign in with your Microsoft corporate account to access the
                    HSE Management System.
                  </p>
                </div>

                {/* Content */}
                <div className="p-6 pt-2 sm:p-8 sm:pt-3">
                  {/* Microsoft Login */}
                  <button
                    type="button"
                    onClick={onMicrosoftLogin}
                    disabled={!onMicrosoftLogin}
                  >
                    Continue with Microsoft
                  </button>

                  {!onMicrosoftLogin && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Microsoft Entra ID login is not configured yet.
                    </p>
                  )}

                  {/* Divider */}
                  <div className="my-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-[#e4e9e4]" />

                    <span className="text-[11px] font-medium text-[#9aa49d]">
                      CORPORATE ACCESS
                    </span>

                    <div className="h-px flex-1 bg-[#e4e9e4]" />
                  </div>

                  {/* Role explanation */}
                  <div className="rounded-2xl border border-[#e3eae3] bg-[#fbfcfa] p-4">
                    <p className="text-sm font-semibold text-[#34463c]">
                      Your role and site access are automatic
                    </p>

                    <p className="mt-1.5 text-xs leading-5 text-[#748078]">
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
                        className="rounded-full border border-[#dfe7df] bg-white px-3 py-1.5 text-[11px] font-medium text-[#617067]"
                      >
                        {role}
                      </span>
                    ))}
                  </div>

                  {/* Security note */}
                  <p className="mt-6 text-center text-[11px] leading-5 text-[#98a29b]">
                    Access is restricted to authenticated corporate users. Your
                    permissions are evaluated according to the assigned
                    user-site-role mapping.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <p className="mt-5 text-center text-[11px] text-[#97a19a]">
                © {new Date().getFullYear()} InspeXO · HSE Management System
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

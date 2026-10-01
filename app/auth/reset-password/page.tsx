import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = {
  title: "Reset password",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-border bg-white/85 p-6 shadow-xl backdrop-blur-xl sm:p-8">
        <p className="text-xs font-semibold tracking-[0.12em] text-ring">ACCOUNT RECOVERY</p>
        <h1 className="pt-2 text-2xl font-semibold tracking-tight text-foreground">
          Choose a new password
        </h1>
        {token ? (
          <div className="mt-6">
            <ResetPasswordForm token={token} />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm leading-6 text-muted-foreground" role="alert">
              This reset link is missing its token. Request a fresh link to continue.
            </p>
            <Link
              href="/auth/forgot-password"
              className="text-sm font-semibold text-primary hover:underline"
            >
              Request a new link
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

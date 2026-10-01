"use client"

import * as React from "react"
import { TriangleAlertIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

// UX-only notice: the backend never blocks unverified users (login succeeds
// by design). The authoritative flag comes from /api/auth/me, read here via
// the prop the server page passes down.
export function VerifyBanner({ userName }: { userName: string }) {
  const [state, setState] = React.useState<"idle" | "sending" | "sent" | "error">("idle")

  async function resend() {
    setState("sending")
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" })
      setState(res.ok ? "sent" : "error")
    } catch {
      setState("error")
    }
  }

  return (
    <div className="px-4 lg:px-6" role="status">
      <div className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-900">
            <span className="font-semibold">{userName}, your email is not verified.</span>{" "}
            {state === "sent"
              ? "Verification link sent — check your inbox."
              : "Verify your mailbox to keep full access."}
            {state === "error" ? " Could not send the link — try again." : null}
          </p>
        </div>
        {state !== "sent" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={state === "sending"}
            onClick={resend}
          >
            {state === "sending" ? "Sending…" : "Resend link"}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

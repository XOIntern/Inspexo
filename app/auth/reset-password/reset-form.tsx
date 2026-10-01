"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isLoading) return;
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "Invalid or expired reset link.");
        return;
      }
      setDone(true);
    } catch {
      setError("Unable to reach the server. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm font-semibold text-accent-foreground">Password updated</p>
        <p className="text-sm leading-6 text-muted-foreground">
          Sign in with your new password. All other sessions were signed out.
        </p>
        <Button type="button" render={<Link href="/auth/login" />} className="h-12 w-full rounded-full text-sm font-semibold">
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field>
        <FieldLabel htmlFor="new-password">New password</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="new-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 12 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={12}
          />
        </InputGroup>
      </Field>
      <Field>
        <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat the new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={12}
          />
        </InputGroup>
      </Field>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        className="h-12 w-full rounded-full text-sm font-semibold"
        disabled={isLoading}
      >
        {isLoading ? "Updating…" : "Set new password"}
      </Button>
    </form>
  );
}

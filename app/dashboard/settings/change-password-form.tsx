"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";

export function ChangePasswordForm() {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isLoading) return;
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "Unable to change password.");
        return;
      }
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      setError("Unable to reach the server. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <Field>
        <FieldLabel htmlFor="current-password">Current password</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </InputGroup>
      </Field>
      <Field>
        <FieldLabel htmlFor="next-password">New password</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="next-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 12 characters"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={12}
          />
        </InputGroup>
      </Field>
      <Field>
        <FieldLabel htmlFor="confirm-next-password">Confirm new password</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="confirm-next-password"
            type="password"
            autoComplete="new-password"
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
      {done ? (
        <p className="text-sm text-emerald-700" role="status">
          Password changed. Other sessions were signed out.
        </p>
      ) : null}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}

"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { roleLabels, statusLabels, USER_ROLES, USER_STATUSES, type UserRow } from "./users-data"

// NOTE: ./actions is superseded by the Admin API (same backend rules, one
// code path). It is kept in place untouched for its owner; this dialog calls
// /api/admin/* over HTTP instead.

export type SiteOption = {
  id: string;
  code: string;
  name: string;
};

async function apiCall(path: string, method: string, body: unknown): Promise<{ tempPassword?: string }> {
  const res = await fetch(path, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; tempPassword?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status}).`);
  }
  return data;
}

function RoleStatusSelects({
  user,
  sites,
}: {
  user?: UserRow;
  sites: SiteOption[];
}) {
  const [role, setRole] = React.useState<UserRow["role"]>(user?.role ?? "auditee")
  const [status, setStatus] = React.useState<UserRow["status"]>(user?.status ?? "active")
  const [siteIds, setSiteIds] = React.useState<string[]>(user?.siteIds ?? [])
  return (
    <>
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="siteIds" value={JSON.stringify(siteIds)} />
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label>Role</Label>
          <Select
            items={USER_ROLES.map((r) => ({ label: roleLabels[r], value: r }))}
            value={role}
            onValueChange={(v) => setRole(v as UserRow["role"])}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {USER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {roleLabels[r]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Status</Label>
          <Select
            items={USER_STATUSES.map((s) => ({ label: statusLabels[s], value: s }))}
            value={status}
            onValueChange={(v) => setStatus(v as UserRow["status"])}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {USER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabels[s]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Sites {role === "auditee" ? "(exactly one)" : "(at least one)"}</Label>
          <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
            {sites.length === 0 ? (
              <p className="text-sm text-muted-foreground">No facilities yet.</p>
            ) : null}
            {sites.map((site) => (
              <label key={site.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={siteIds.includes(site.id)}
                  onChange={() =>
                    setSiteIds((prev) =>
                      prev.includes(site.id) ? prev.filter((id) => id !== site.id) : [...prev, site.id],
                    )
                  }
                />
                <span>
                  {site.name} <span className="text-muted-foreground">({site.code})</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export function UserDialog({
  user,
  sites = [],
  triggerLabel,
  asMenuItem = false,
  triggerVariant = "link",
  onSaved,
}: {
  user?: UserRow
  sites?: SiteOption[]
  triggerLabel: string
  asMenuItem?: boolean
  triggerVariant?: "default" | "outline" | "link"
  onSaved?: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [tempPassword, setTempPassword] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const isEdit = Boolean(user)

  async function handleSubmit(formData: FormData) {
    if (isSaving) return
    setError(null)
    setTempPassword(null)
    const siteIds: string[] = JSON.parse(String(formData.get("siteIds") ?? "[]"))
    const input = {
      id: user?.id,
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? "auditee"),
      status: String(formData.get("status") ?? "active"),
    }
    setIsSaving(true)
    try {
      if (user) {
        await apiCall(`/api/admin/users/${user.id}/contact`, "PATCH", {
          name: input.name,
          email: input.email,
        })
        await apiCall(`/api/admin/users/${user.id}/role`, "PATCH", {
          role: input.role,
        })
        await apiCall(`/api/admin/users/${user.id}/sites`, "PUT", { siteIds })
        await apiCall(`/api/admin/users/${user.id}/status`, "PATCH", {
          status: input.status,
        })
      } else {
        const created = await apiCall("/api/admin/users", "POST", { ...input, siteIds })
        if (created.tempPassword) {
          setTempPassword(created.tempPassword)
          return
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid data or email already in use.")
      return
    } finally {
      setIsSaving(false)
    }
    setOpen(false)
    onSaved?.()
  }

  const trigger = asMenuItem ? (
    <DialogTrigger render={<Button variant="ghost" className="w-full justify-start px-2 font-normal" />}>
      {triggerLabel}
    </DialogTrigger>
  ) : (
    <DialogTrigger render={<Button variant={triggerVariant} className={triggerVariant === "link" ? "w-fit px-0 text-left text-foreground" : undefined} />}>
      {triggerLabel}
    </DialogTrigger>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit user" : "Add user"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the user registry entry." : "Add a new user to the registry."}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <div className="flex flex-col gap-4 py-1">
            <div className="flex flex-col gap-2">
              <Label htmlFor="user-name">Name</Label>
              <Input id="user-name" name="name" defaultValue={user?.name} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="user-email">Email</Label>
              <Input id="user-email" name="email" type="email" defaultValue={user?.email} required />
            </div>
            <RoleStatusSelects user={user} sites={sites} />
            {tempPassword ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3" role="status">
                <p className="text-sm font-semibold text-emerald-900">
                  Temporary password (shown once — relay it out-of-band)
                </p>
                <code className="mt-1 block rounded-lg bg-white px-3 py-2 font-mono text-sm">
                  {tempPassword}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    setTempPassword(null)
                    setOpen(false)
                    onSaved?.()
                  }}
                >
                  Done
                </Button>
              </div>
            ) : null}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving…" : isEdit ? "Save changes" : "Create user"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

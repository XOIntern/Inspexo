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

import { createUser, updateUser } from "./actions"
import {
  roleLabels,
  statusLabels,
  USER_ROLES,
  USER_STATUSES,
  type UserRow,
} from "./users-data"

function RoleStatusSelects({ user }: { user?: UserRow }) {
  const [role, setRole] = React.useState<UserRow["role"]>(user?.role ?? "hse_officer")
  const [status, setStatus] = React.useState<UserRow["status"]>(user?.status ?? "active")
  return (
    <>
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="status" value={status} />
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
      </div>
    </>
  )
}

export function UserDialog({
  user,
  triggerLabel,
  asMenuItem = false,
  triggerVariant = "link",
}: {
  user?: UserRow
  triggerLabel: string
  asMenuItem?: boolean
  triggerVariant?: "default" | "outline" | "link"
}) {
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const isEdit = Boolean(user)

  async function handleSubmit(formData: FormData) {
    setError(null)
    const input = {
      id: user?.id,
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? "hse_officer"),
      status: String(formData.get("status") ?? "active"),
    }
    // Server action melempar saat zod gagal — tampilkan pesan generik.
    try {
      await (user ? updateUser : createUser)(input)
    } catch {
      setError("Invalid data or email already in use.")
      return
    }
    setOpen(false)
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
            <RoleStatusSelects user={user} />
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

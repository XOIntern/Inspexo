"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch, type AdminSite, type AdminUser, type ApiError } from "@/lib/admin-api";

const ROLES = ["verificator", "auditor", "auditee"] as const;
const STATUSES = ["active", "inactive", "suspended"] as const;

export type UserFormResult =
  | { id: string; tempPassword?: string }
  | null;

export function UserFormDialog({
  user,
  sites,
  open,
  onOpenChange,
  onSaved,
}: {
  user: AdminUser | null;
  sites: AdminSite[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (result: Exclude<UserFormResult, null>) => void;
}) {
  const isEdit = user !== null;
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<string>("auditee");
  const [status, setStatus] = React.useState<string>("active");
  const [siteIds, setSiteIds] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName(user?.name ?? "");
      setEmail(user?.email ?? "");
      setRole(user?.role ?? "auditee");
      setStatus(user?.status ?? "active");
      setSiteIds(user?.siteIds ?? []);
      setError(null);
    }
  }, [open, user]);

  function toggleSite(siteId: string) {
    setSiteIds((prev) => (prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      if (!isEdit) {
        const result = await apiFetch<{ user: AdminUser; tempPassword: string }>(
          "/api/admin/users",
          {
            method: "POST",
            body: JSON.stringify({ name: name.trim(), email: email.trim(), role, status, siteIds }),
          },
        );
        onSaved({ id: result.user.id, tempPassword: result.tempPassword });
      } else {
        const id = (user as AdminUser).id;
        await apiFetch(`/api/admin/users/${id}/role`, {
          method: "PATCH",
          body: JSON.stringify({ role }),
        });
        await apiFetch(`/api/admin/users/${id}/sites`, {
          method: "PUT",
          body: JSON.stringify({ siteIds }),
        });
        await apiFetch(`/api/admin/users/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        onSaved({ id });
      }
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).error ?? "Unable to save the user.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit user" : "Add user"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Role, sites, and status are validated server-side."
              : "The temporary password is shown once after creation."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-user-name">Name</Label>
            <Input
              id="admin-user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="admin-user-email">Email</Label>
            <Input
              id="admin-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isEdit}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v ?? "auditee")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v ?? "active")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Sites {role === "auditee" ? "(exactly one)" : "(at least one)"}</Label>
            <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
              {sites.length === 0 ? (
                <p className="text-sm text-muted-foreground">No facilities yet.</p>
              ) : null}
              {sites.map((site) => (
                <label key={site.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={siteIds.includes(site.id)}
                    onCheckedChange={() => toggleSite(site.id)}
                  />
                  <span>
                    {site.name} <span className="text-muted-foreground">({site.code})</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error} <Badge variant="outline">validated server-side</Badge>
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving…" : isEdit ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

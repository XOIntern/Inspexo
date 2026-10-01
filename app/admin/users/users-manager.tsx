"use client";

import * as React from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  apiFetch,
  buildUsersQuery,
  type AdminSite,
  type AdminUser,
  type ApiError,
  type UsersList,
} from "@/lib/admin-api";
import { UserFormDialog } from "./user-form-dialog";

const PAGE_SIZE = 10;

function VerificationBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
      Verified
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-amber-50 text-amber-700">
      Unverified
    </Badge>
  );
}

export function AdminUsersManager({ sites }: { sites: AdminSite[] }) {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [committedSearch, setCommittedSearch] = React.useState("");
  const [role, setRole] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<AdminUser | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [newCredential, setNewCredential] = React.useState<{
    id: string;
    tempPassword: string;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiFetch<UsersList>(
        buildUsersQuery({ search: committedSearch, role, status, page, pageSize: PAGE_SIZE }),
      );
      setUsers(result.users);
      setTotal(result.total);
    } catch (err) {
      setError((err as ApiError).error ?? "Unable to load users.");
    } finally {
      setIsLoading(false);
    }
  }, [committedSearch, role, status, page]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setNewCredential(null);
    setDialogOpen(true);
  }

  function openEdit(user: AdminUser) {
    setEditing(user);
    setNewCredential(null);
    setDialogOpen(true);
  }

  async function toggleStatus(user: AdminUser) {
    const next = user.status === "active" ? "inactive" : "active";
    try {
      await apiFetch(`/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      await load();
    } catch (err) {
      setError((err as ApiError).error ?? "Unable to change status.");
    }
  }

  async function copyCredential() {
    if (!newCredential) return;
    try {
      await navigator.clipboard.writeText(newCredential.tempPassword);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            {total} account{total === 1 ? "" : "s"} · roles and sites are validated server-side
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" render={<Link href="/admin/users/import" />}>
            Bulk import
          </Button>
          <Button type="button" onClick={openCreate}>
            Add user
          </Button>
        </div>
      </div>

      {newCredential ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4" role="status">
          <p className="text-sm font-semibold text-emerald-900">
            Temporary password (shown once — relay it out-of-band, then dismiss)
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="rounded-lg bg-white px-3 py-2 font-mono text-sm">
              {newCredential.tempPassword}
            </code>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={copyCredential}>
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setNewCredential(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="admin-user-search">Search</Label>
          <div className="flex gap-2">
            <Input
              id="admin-user-search"
              placeholder="Name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  setCommittedSearch(search);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPage(1);
                setCommittedSearch(search);
              }}
            >
              Search
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Role</Label>
          <Select
            value={role}
            onValueChange={(v) => {
              setPage(1);
              setRole(v ?? "all");
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["all", "admin", "verificator", "auditor", "auditee"].map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => {
              setPage(1);
              setStatus(v ?? "all");
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["all", "active", "inactive", "suspended"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Sites</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <VerificationBadge verified={user.emailVerified} />
                  </TableCell>
                  <TableCell>{user.siteIds.length}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => openEdit(user)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleStatus(user)}
                      >
                        {user.status === "active" ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {page} of {pageCount}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <UserFormDialog
        user={editing}
        sites={sites}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={(result) => {
          if (result.tempPassword) {
            setNewCredential({ id: result.id, tempPassword: result.tempPassword });
          }
          void load();
        }}
      />
    </div>
  );
}

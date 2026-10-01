import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AuthError } from "@/src/lib/auth/errors";
import { requireUser } from "@/src/lib/auth/server-user";
import { requireRole } from "@/src/lib/auth/authorize";

import { UserTable } from "./user-table";
import type { UserRow } from "./users-data";

// Data dari Admin API — UI tidak pernah menyentuh database langsung.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Users",
};

type SiteOption = {
  id: string;
  code: string;
  name: string;
};

async function apiGet<T>(path: string): Promise<T> {
  const host = (await headers()).get("host") ?? "localhost:3000";
  const proto = process.env.NODE_ENV === "production" ? "https" : "http";
  const res = await fetch(`${proto}://${host}${path}`, {
    headers: { cookie: (await cookies()).toString() },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Admin API ${path} failed (${res.status}).`);
  }
  return (await res.json()) as T;
}

export default async function UsersPage() {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/auth/login");
  }
  try {
    requireRole(user, "admin");
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/dashboard");
    }
    throw error;
  }

  const [{ users }, { sites }] = await Promise.all([
    apiGet<{ users: UserRow[]; total: number }>("/api/admin/users?pageSize=100"),
    apiGet<{ sites: SiteOption[] }>("/api/admin/sites"),
  ]);
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        user={{ name: user.name, email: user.email, avatar: "" }}
        role={user.role}
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="flex flex-col gap-1 px-4 lg:px-6">
                <h1 className="text-2xl font-semibold">User Management</h1>
                <p className="text-sm text-muted-foreground">
                  Manage the InspeXO user registry: roles, status, and access.
                </p>
              </div>
              <div className="px-4 lg:px-6">
                <UserTable data={users} sites={sites} />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

import type { Metadata } from "next";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { UserTable } from "./user-table";
import type { UserRow } from "./users-data";

// Data dari DB per-request — jangan di-prerender saat build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Users",
};

async function getUsers(): Promise<UserRow[]> {
  try {
    const { db } = await import("@/src/prisma/db");
    const rows = await db.orm.public.User.orderBy((u) =>
      u.createdAt.desc(),
    ).all();
    return rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as UserRow["role"],
      status: u.status as UserRow["status"],
      createdAt: u.createdAt.toString(),
    }));
  } catch (err) {
    // DB belum di-init/seed (atau belum jalan) — biarkan error boundary yang handle.
    console.error("Failed to load users:", err);
    throw err;
  }
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
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
                <UserTable data={users} />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

import { redirect } from "next/navigation";
import { ClipboardListIcon, LayoutDashboardIcon, UploadIcon } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AuthError } from "@/src/lib/auth/errors";
import { requireUser } from "@/src/lib/auth/server-user";
import { requireRole } from "@/src/lib/auth/authorize";

// The backend is the security boundary: this gate only decides what to
// render. Every admin API re-checks the session and the role server-side.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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
        navMain={[
          { title: "Overview", url: "/admin", icon: <LayoutDashboardIcon /> },
          { title: "Users", url: "/admin/users", icon: <ClipboardListIcon /> },
          { title: "Import", url: "/admin/users/import", icon: <UploadIcon /> },
        ]}
      />
      <SidebarInset>
        <SiteHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireUser } from "@/src/lib/auth/server-user";

import { ChangePasswordForm } from "./change-password-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/auth/login");
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
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
          <div>
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Signed in as {user.name} ({user.email}) · {user.role}
            </p>
          </div>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Password</h2>
            <ChangePasswordForm />
          </section>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

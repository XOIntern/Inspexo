import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { VerifyBanner } from "@/components/verify-banner";
import { listSites } from "@/src/lib/auth/admin-queries";
import { requireUser } from "@/src/lib/auth/server-user";

import data from "./data.json"
import { findingsSchema } from "@/lib/findings"

// Validasi data dummy saat build; ganti dengan query findings saat model DB siap.
const findings = findingsSchema.parse(data)

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/auth/login");
  }
  if (user.role === "admin") {
    redirect("/admin");
  }
  const sites = (await listSites()).filter((site) => user.siteIds.includes(site.id));

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
        sites={sites.map((site) => ({ name: site.name, url: "#" }))}
        role={user.role}
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {user.emailVerified ? null : <VerifyBanner userName={user.name} />}
              <SectionCards />
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>
              <DataTable data={findings} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

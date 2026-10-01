import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminOverview } from "@/src/lib/auth/admin-queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin overview",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admins",
  verificator: "Verificators",
  auditor: "Auditors",
  auditee: "Auditees",
};

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview();

  const roleCards = Object.entries(overview.byRole).map(([role, count]) => ({
    label: ROLE_LABELS[role] ?? role,
    count,
  }));

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Administration</h1>
        <p className="text-sm text-muted-foreground">
          User registry, roles, sites, and verification at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total users</CardDescription>
            <CardTitle className="text-3xl">{overview.totalUsers}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="outline" size="sm" render={<Link href="/admin/users" />}>
              Manage users
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Unverified emails</CardDescription>
            <CardTitle className="text-3xl">{overview.unverifiedUsers}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="outline"
              size="sm"
              render={<Link href="/admin/users/import" />}
            >
              Import users
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Suspended accounts</CardDescription>
            <CardTitle className="text-3xl">{overview.suspendedUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Facilities</CardDescription>
            <CardTitle className="text-3xl">{overview.totalSites}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users by role</CardTitle>
          <CardDescription>Roles are assigned by admins only; never self-selected.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {roleCards.map((item) => (
            <Badge key={item.label} variant="outline" className="px-3 py-1.5 text-sm">
              {item.label}: {item.count}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

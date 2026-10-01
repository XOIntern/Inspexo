import type { Metadata } from "next";

import { listSites } from "@/src/lib/auth/admin-queries";
import { AdminUsersManager } from "./users-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin users",
};

export default async function AdminUsersPage() {
  const sites = await listSites();
  return <AdminUsersManager sites={sites} />;
}

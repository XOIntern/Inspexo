import type { Metadata } from "next";

import { listSites } from "@/src/lib/auth/admin-queries";
import { ImportManager } from "./import-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bulk import users",
};

export default async function AdminImportPage() {
  const sites = await listSites();
  return <ImportManager sites={sites} />;
}

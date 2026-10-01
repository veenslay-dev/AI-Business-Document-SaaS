import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { PageHeader } from "@/components/dashboard/page-header";
import { requirePlatformAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();
  return (<><PageHeader title="Admin" description="Everything across all workspaces. Only you can see this area." /><AdminNav />{children}</>);
}

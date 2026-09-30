import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { ClientForm } from "@/components/clients/client-form";
import { requireWorkspace } from "@/lib/auth/session";
import { getClient } from "@/lib/db/clients";

export const metadata: Metadata = { title: "Edit client" };

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { membership } = await requireWorkspace();
  const c = await getClient(membership.workspaceId, (await params).id);
  if (!c) notFound();
  return (
    <>
      <PageHeader title={`Edit ${c.company_name}`} />
      <ClientForm clientId={c.id} defaults={{
        companyName: c.company_name, contactName: c.contact_name ?? "", email: c.email ?? "", phone: c.phone ?? "", website: c.website ?? "",
        industry: c.industry ?? "", address: c.address ?? "", gstNumber: c.gst_number ?? "", notes: c.notes ?? "",
      }} />
    </>
  );
}

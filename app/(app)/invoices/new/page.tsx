import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { requireWorkspace } from "@/lib/auth/session";
import { clientOptions } from "@/lib/db/clients";
import { listEditorTemplates } from "@/lib/db/templates";

export const metadata: Metadata = { title: "New invoice" };
export const dynamic = "force-dynamic";

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { membership } = await requireWorkspace();
  const [clients, templates] = await Promise.all([clientOptions(membership.workspaceId), listEditorTemplates(membership.workspaceId, "invoice")]);
  return (
    <>
      <PageHeader title="New invoice" />
      <InvoiceForm clients={clients} templates={templates.map((t) => ({ value: t.value, label: t.label }))} presetClient={(await searchParams).client ?? ""} />
    </>
  );
}

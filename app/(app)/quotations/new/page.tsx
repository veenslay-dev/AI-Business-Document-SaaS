import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { QuotationForm } from "@/components/quotations/quotation-form";
import { requireWorkspace } from "@/lib/auth/session";
import { clientOptions } from "@/lib/db/clients";
import { listEditorTemplates } from "@/lib/db/templates";

export const metadata: Metadata = { title: "New quotation" };
export const dynamic = "force-dynamic";

export default async function NewQuotationPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { membership } = await requireWorkspace();
  const [clients, templates] = await Promise.all([clientOptions(membership.workspaceId), listEditorTemplates(membership.workspaceId, "quotation")]);
  return (
    <>
      <PageHeader title="New quotation" />
      <QuotationForm clients={clients} templates={templates.map((t) => ({ value: t.value, label: t.label }))} presetClient={(await searchParams).client ?? ""} />
    </>
  );
}

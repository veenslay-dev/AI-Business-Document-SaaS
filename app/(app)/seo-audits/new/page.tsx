import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { AuditForm } from "@/components/audits/audit-form";
import { requireWorkspace } from "@/lib/auth/session";
import { clientOptions } from "@/lib/db/clients";
import { listEditorTemplates } from "@/lib/db/templates";

export const metadata: Metadata = { title: "New SEO audit" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function NewAuditPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { membership } = await requireWorkspace();
  const [clients, templates] = await Promise.all([
    clientOptions(membership.workspaceId), listEditorTemplates(membership.workspaceId, "seo_audit"),
  ]);
  const aiConfigured = !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
  return (
    <>
      <PageHeader title="New SEO audit" description="Enter a website. We scan it and build a branded report you can edit before sharing." />
      <AuditForm clients={clients} presetClient={(await searchParams).client ?? ""} aiConfigured={aiConfigured} templates={templates.map((t) => ({ value: t.value, label: t.label }))} />
    </>
  );
}

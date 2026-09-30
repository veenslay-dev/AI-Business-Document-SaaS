import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { SocialAuditForm } from "@/components/audits/social-audit-form";
import { requireWorkspace } from "@/lib/auth/session";
import { clientOptions } from "@/lib/db/clients";
import { listEditorTemplates } from "@/lib/db/templates";

export const metadata: Metadata = { title: "New social media audit" };
export const dynamic = "force-dynamic";

export default async function NewSocialAuditPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { membership } = await requireWorkspace();
  const [clients, templates] = await Promise.all([clientOptions(membership.workspaceId), listEditorTemplates(membership.workspaceId, "social_audit")]);
  return (
    <>
      <PageHeader title="New social media audit" description="A checklist audit you complete by reviewing the client's accounts. Nothing is filled in automatically." />
      <SocialAuditForm clients={clients} presetClient={(await searchParams).client ?? ""} templates={templates.map((t) => ({ value: t.value, label: t.label }))} />
    </>
  );
}

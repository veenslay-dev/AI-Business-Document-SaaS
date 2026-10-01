import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProposalWizard } from "@/components/proposals/proposal-wizard";
import { requireWorkspace } from "@/lib/auth/session";
import { listEditorTemplates, listPackages } from "@/lib/db/templates";
import { getWorkspaceBranding } from "@/lib/db/workspace";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New proposal" };
export const dynamic = "force-dynamic";

export default async function NewProposalPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { membership } = await requireWorkspace();
  const supabase = await createClient();
  const [branding, templates, packages, clients] = await Promise.all([
    getWorkspaceBranding(membership.workspaceId),
    listEditorTemplates(membership.workspaceId, "proposal"),
    listPackages(membership.workspaceId),
    supabase.from("clients").select("id, company_name, contact_name, email, phone, address").eq("workspace_id", membership.workspaceId).is("archived_at", null).order("company_name").limit(500),
  ]);
  if (!branding) return <p role="alert">We couldn't load your company profile. Refresh to try again.</p>;
  const aiConfigured = !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);

  return (
    <>
      <PageHeader title="New proposal" />
      <ProposalWizard
        brand={branding.context} templates={templates} aiConfigured={aiConfigured} presetClient={(await searchParams).client ?? ""}
        servicesFromProfile={branding.context.company.services}
        packages={packages.map((p) => ({ id: p.id, name: p.name, price: p.price, description: p.description, features: p.features }))}
        clients={(clients.data ?? []).map((c) => ({ id: c.id, name: c.company_name, contact: c.contact_name ?? "", email: c.email ?? "", phone: c.phone ?? "", address: c.address ?? "" }))}
      />
    </>
  );
}

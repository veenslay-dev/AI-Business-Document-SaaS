import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { CustomTemplateActions } from "@/components/templates/template-actions";
import { PackageManager } from "@/components/templates/package-manager";
import { TemplateThumb } from "@/components/templates/template-gallery";
import { Badge } from "@/components/ui/badge";
import { requireWorkspace } from "@/lib/auth/session";
import { getWorkspaceBranding } from "@/lib/db/workspace";
import { listPackages } from "@/lib/db/templates";
import { fallbackConfig } from "@/lib/documents/templates";
import { SYSTEM_TEMPLATES, normalizeConfig, type DocType } from "@/lib/documents/templates";
import { can } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Templates" };
const GROUPS: { type: DocType; label: string }[] = [{ type: "proposal", label: "Proposals" }, { type: "quotation", label: "Quotations" }, { type: "seo_audit", label: "SEO audits" }, { type: "social_audit", label: "Social media audits" }];

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { membership } = await requireWorkspace();
  const tab = (await searchParams).tab === "packages" ? "packages" : "templates";
  const supabase = await createClient();
  const [branding, packages, custom] = await Promise.all([
    getWorkspaceBranding(membership.workspaceId), listPackages(membership.workspaceId),
    supabase.from("document_templates").select("id, name, type, template_config, is_default").eq("workspace_id", membership.workspaceId).order("name"),
  ]);
  const b = branding?.brand;
  const colors = { primary: b?.primary_color ?? "#1f3a5f", secondary: b?.secondary_color ?? "#e8eef6", accent: b?.accent_color ?? "#c8553d" };
  const canEdit = can(membership.role, "company:update");

  return (
    <>
      <PageHeader title="Templates" description="Templates change how a document looks. Your colors, fonts and logo come from the brand kit, so every template already looks like you." />
      <nav aria-label="Templates sections" className="mb-8 flex gap-1 border-b border-line">
        {([["templates", "Document templates"], ["packages", "Pricing packages"]] as const).map(([k, label]) => (
          <Link key={k} href={`/templates?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={cn("-mb-px border-b-2 px-3 py-2.5 text-sm", tab === k ? "border-brand font-medium" : "border-transparent text-ink-soft hover:text-ink")}>{label}</Link>
        ))}
      </nav>

      {tab === "packages" ? (
        <>
          <p className="mb-5 max-w-2xl text-sm text-ink-soft">Set up Basic, Standard and Premium once. In the proposal builder you choose which to show and which one to recommend.</p>
          <PackageManager canEdit={can(membership.role, "document:create")} packages={packages.map((p) => ({ id: p.id, tier: (["basic", "standard", "premium", "custom"].includes(p.tier) ? p.tier : "custom") as "custom", name: p.name, description: p.description, price: p.price, currency: p.currency, features: p.features }))} />
        </>
      ) : (
        <div className="space-y-10">
          {GROUPS.map((g) => {
            const sys = SYSTEM_TEMPLATES.filter((t) => t.type === g.type);
            const mine = (custom.data ?? []).filter((t) => t.type === g.type);
            return (
              <section key={g.type}>
                <h2 className="mb-3 font-semibold">{g.label}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sys.map((t) => (
                    <article key={t.key} className="rounded-lg border border-line bg-surface p-3 shadow-soft">
                      <TemplateThumb config={t.config} {...colors} />
                      <h3 className="mt-3 font-medium">{t.name}</h3><p className="text-sm text-ink-soft">{t.description}</p>
                    </article>
                  ))}
                  {mine.map((t) => (
                    <article key={t.id} className="rounded-lg border border-line bg-surface p-3 shadow-soft">
                      <TemplateThumb config={normalizeConfig((t.template_config as { config?: unknown })?.config, fallbackConfig(g.type))} {...colors} />
                      <div className="mt-3 flex items-center gap-2"><h3 className="font-medium">{t.name}</h3>{t.is_default && <Badge tone="ok">Default</Badge>}<Badge>Yours</Badge></div>
                      <p className="mb-2 text-sm text-ink-soft">{((t.template_config as { outline?: unknown[] })?.outline ?? []).length} sections</p>
                      <CustomTemplateActions id={t.id} type={t.type} isDefault={t.is_default} canEdit={canEdit} />
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
          <p className="text-sm text-ink-soft">To create your own, open any document, pick a layout and use <strong>Save as template</strong> in the editor.</p>
        </div>
      )}
    </>
  );
}

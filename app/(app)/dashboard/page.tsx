import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle, FileText, Plus, Receipt, SearchCheck, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DocumentTable } from "@/components/documents/document-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireWorkspace } from "@/lib/auth/session";
import { getWorkspaceBranding } from "@/lib/db/workspace";
import { listDocuments } from "@/lib/db/documents";
import { formatMoney } from "@/lib/documents/quotation";
import { can } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

type Stats = { total: number; proposals: number; quotations: number; audits: number; accepted_proposals: number; quotation_value: Record<string, number> };

export default async function DashboardPage() {
  const { membership } = await requireWorkspace();
  const supabase = await createClient();
  const [statsRes, recent, data] = await Promise.all([
    supabase.rpc("dashboard_stats", { ws: membership.workspaceId }),
    listDocuments({ workspaceId: membership.workspaceId, pageSize: 8 }),
    getWorkspaceBranding(membership.workspaceId),
  ]);
  const stats: Stats = (statsRes.data as Stats | null) ?? { total: 0, proposals: 0, quotations: 0, audits: 0, accepted_proposals: 0, quotation_value: {} };
  const c = data?.company; const b = data?.brand;

  const value = Object.entries(stats.quotation_value);
  const cards: { label: string; value: React.ReactNode }[] = [
    { label: "Total documents", value: stats.total },
    { label: "Proposals", value: stats.proposals },
    { label: "Quotations", value: stats.quotations },
    { label: "SEO audits", value: stats.audits },
    { label: "Accepted proposals", value: stats.accepted_proposals },
    { label: "Quotation value", value: value.length === 0 ? formatMoney(0, "INR") : value.map(([cur, v]) => <span key={cur} className="block">{formatMoney(Number(v), cur)}</span>) },
  ];

  const setup = [
    { done: !!c?.email && !!c?.phone, label: "Add your business email and phone", href: "/settings/company" },
    { done: !!b?.logo_url, label: "Upload your logo", href: "/brand-kit" },
    { done: Array.isArray(c?.services) && (c?.services as unknown[]).length > 0, label: "List the services you offer", href: "/settings/company" },
    { done: !!c?.default_terms, label: "Write your default terms", href: "/settings/company" },
    { done: !!c?.signature_url, label: "Add a signature for documents", href: "/settings/company" },
  ];
  const remaining = setup.filter((s) => !s.done);
  const canCreate = can(membership.role, "document:create");

  return (
    <>
      <PageHeader title="Dashboard" description={membership.name}
        actions={canCreate && (
          <div className="flex flex-wrap gap-2">
            <Button asChild><Link href="/proposals/new"><FileText className="size-4" aria-hidden />New proposal</Link></Button>
            <Button asChild variant="secondary"><Link href="/quotations/new"><Receipt className="size-4" aria-hidden />New quotation</Link></Button>
            <Button asChild variant="secondary"><Link href="/seo-audits/new"><SearchCheck className="size-4" aria-hidden />New SEO audit</Link></Button>
            <Button asChild variant="secondary"><Link href="/clients/new"><UserPlus className="size-4" aria-hidden />Add client</Link></Button>
          </div>)} />

      <section aria-label="Summary" className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-6">
        {cards.map((s) => (
          <div key={s.label} className="rounded-lg border border-line bg-surface p-4 shadow-soft">
            <p className="text-xs text-ink-faint">{s.label}</p>
            <p className="mt-1 font-serif text-2xl tabular-nums leading-tight">{s.value}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Recent documents</h2></div>
          {recent.rows.length === 0 ? (
            <EmptyState icon={FileText} title="No documents yet" action={canCreate && <Button asChild><Link href="/proposals/new"><Plus className="size-4" aria-hidden />Create your first proposal</Link></Button>}>
              Pick a client, describe the project, and the AI drafts a proposal in your branding.
            </EmptyState>
          ) : <DocumentTable rows={recent.rows} canDelete={can(membership.role, "document:delete")} />}
        </section>

        {remaining.length > 0 && (
          <aside className="h-fit rounded-lg border border-line bg-surface shadow-soft">
            <div className="border-b border-line px-4 py-3"><h2 className="text-sm font-semibold">Finish your profile</h2><p className="text-xs text-ink-soft">{remaining.length} of {setup.length} left</p></div>
            <ul className="divide-y divide-line">{setup.map((s) => (
              <li key={s.label}><Link href={s.href} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-paper">
                {s.done ? <CheckCircle2 className="size-4 text-ok" aria-hidden /> : <Circle className="size-4 text-ink-faint" aria-hidden />}
                <span className={s.done ? "text-ink-faint line-through" : ""}>{s.label}</span></Link></li>))}</ul>
          </aside>
        )}
      </div>
    </>
  );
}

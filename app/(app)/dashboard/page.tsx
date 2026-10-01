import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CheckCircle2, ChevronDown, Circle, FileText, IndianRupee, Megaphone, Plus, Receipt, ReceiptText, SearchCheck, UserPlus } from "lucide-react";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
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
  const cards: { label: string; value: React.ReactNode; icon: typeof FileText }[] = [
    { label: "Total documents", value: stats.total, icon: FileText },
    { label: "Proposals", value: stats.proposals, icon: FileText },
    { label: "Quotations", value: stats.quotations, icon: Receipt },
    { label: "SEO audits", value: stats.audits, icon: SearchCheck },
    { label: "Accepted proposals", value: stats.accepted_proposals, icon: BadgeCheck },
    { label: "Quotation value", value: value.length === 0 ? formatMoney(0, "INR") : value.map(([cur, v]) => <span key={cur} className="block">{formatMoney(Number(v), cur)}</span>), icon: IndianRupee },
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
      <PageHeader title="Dashboard" description="Manage your documents, clients and projects all in one place." />

      <section aria-label="Summary" className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        {cards.map(({ label, value: v, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="size-[18px]" /></span>
              <p className="text-sm font-medium text-ink-soft">{label}</p>
            </div>
            <p className="mt-4 text-3xl font-extrabold tabular-nums leading-tight tracking-tight">{v}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-xl font-bold">Recent documents</h2><p className="text-sm text-ink-soft">View and manage your latest documents.</p></div>
            {canCreate && (
              <Dropdown>
                <DropdownTrigger className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-soft hover:bg-brand-hover"><Plus className="size-4" aria-hidden />New document<ChevronDown className="size-4" aria-hidden /></DropdownTrigger>
                <DropdownContent align="end">
                  {([["/proposals/new", "Proposal", FileText], ["/quotations/new", "Quotation", Receipt], ["/invoices/new", "Invoice", ReceiptText], ["/seo-audits/new", "SEO audit", SearchCheck], ["/social-audits/new", "Social media audit", Megaphone], ["/clients/new", "Client", UserPlus]] as const).map(([href, label, Icon]) => (
                    <DropdownItem key={href} asChild><Link href={href}><Icon className="size-4" aria-hidden />{label}</Link></DropdownItem>
                  ))}
                </DropdownContent>
              </Dropdown>
            )}
          </div>
          {recent.rows.length === 0 ? (
            <EmptyState icon={FileText} title="No documents yet" action={canCreate && <Button asChild><Link href="/proposals/new"><Plus className="size-4" aria-hidden />Create your first proposal</Link></Button>}>
              Pick a client, describe the project, and the AI drafts a proposal in your branding.
            </EmptyState>
          ) : <DocumentTable rows={recent.rows} canDelete={can(membership.role, "document:delete")} />}
        </section>

        {remaining.length > 0 && (
          <aside className="h-fit overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
            <div className="bg-gradient-to-br from-brand-soft to-white p-5">
              <div className="flex items-center gap-4">
                <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-white shadow-soft"><CheckCircle2 className="size-6" /></span>
                <div><h2 className="text-lg font-bold leading-tight">Finish your profile</h2><p className="text-sm text-ink-soft">{remaining.length} of {setup.length} left</p></div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/5" role="progressbar" aria-valuemin={0} aria-valuemax={setup.length} aria-valuenow={setup.length - remaining.length} aria-label="Profile completion">
                <div className="h-full rounded-full bg-brand" style={{ width: `${((setup.length - remaining.length) / setup.length) * 100}%` }} />
              </div>
            </div>
            <ul className="divide-y divide-line">{setup.map((s) => (
              <li key={s.label}><Link href={s.href} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-brand-soft/30">
                {s.done ? <CheckCircle2 className="size-[18px] text-brand" aria-hidden /> : <Circle className="size-[18px] text-ink-faint" aria-hidden />}
                <span className={s.done ? "text-ink-faint line-through" : "font-medium"}>{s.label}</span></Link></li>))}</ul>
          </aside>
        )}
      </div>
    </>
  );
}

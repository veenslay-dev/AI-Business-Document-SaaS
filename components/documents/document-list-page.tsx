import Link from "next/link";
import { FileText, Plus, Receipt, SearchCheck, Search } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DocumentTable } from "@/components/documents/document-table";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { requireWorkspace } from "@/lib/auth/session";
import { listDocuments, PAGE_SIZE, TYPE_LABEL } from "@/lib/db/documents";
import type { DocType } from "@/lib/documents/templates";
import { can } from "@/lib/permissions/roles";

const META: Record<string, { title: string; blurb: string; newHref: string; icon: typeof FileText; cta: string }> = {
  proposal: { title: "Proposals", blurb: "Branded proposals with AI drafting, sharing and client acceptance.", newHref: "/proposals/new", icon: FileText, cta: "New proposal" },
  quotation: { title: "Quotations", blurb: "Itemised quotations with automatic tax and discount maths.", newHref: "/quotations/new", icon: Receipt, cta: "New quotation" },
  seo_audit: { title: "SEO Audits", blurb: "Scan a website and turn the findings into a client-ready report.", newHref: "/seo-audits/new", icon: SearchCheck, cta: "New SEO audit" },
};

export async function DocumentListPage({ type, searchParams }: { type: DocType; searchParams: { q?: string; status?: string; page?: string } }) {
  const { membership } = await requireWorkspace();
  const m = META[type];
  const page = Math.max(1, Number(searchParams.page) || 1);
  const { rows, total } = await listDocuments({ workspaceId: membership.workspaceId, type, q: searchParams.q, status: searchParams.status, page });
  const filtered = !!(searchParams.q || searchParams.status);
  const Icon = m.icon;

  return (
    <>
      <PageHeader title={m.title} description={m.blurb} actions={<Button asChild><Link href={m.newHref}><Plus className="size-4" aria-hidden />{m.cta}</Link></Button>} />
      <form className="mb-5 flex flex-wrap gap-2" role="search">
        <div className="relative min-w-56 flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-ink-faint" aria-hidden />
          <Input name="q" defaultValue={searchParams.q} placeholder={`Search ${m.title.toLowerCase()}`} aria-label={`Search ${m.title}`} className="pl-9" /></div>
        <Select name="status" defaultValue={searchParams.status ?? ""} aria-label="Filter by status" className="w-40">
          <option value="">All statuses</option>{["draft", "sent", "viewed", "accepted", "rejected", "expired"].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</Select>
        <Button type="submit" variant="secondary">Apply</Button>
        {filtered && <Button asChild variant="ghost"><Link href={`/${type === "proposal" ? "proposals" : type === "quotation" ? "quotations" : "seo-audits"}`}>Clear</Link></Button>}
      </form>
      {rows.length === 0 ? (
        <EmptyState icon={Icon} title={filtered ? "Nothing matches" : `No ${TYPE_LABEL[type].toLowerCase()}s yet`} action={!filtered && <Button asChild><Link href={m.newHref}>{m.cta}</Link></Button>}>
          {filtered ? "Try different filters." : m.blurb}
        </EmptyState>
      ) : <DocumentTable rows={rows} canDelete={can(membership.role, "document:delete")} />}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath={`/${type === "proposal" ? "proposals" : type === "quotation" ? "quotations" : "seo-audits"}`} params={{ q: searchParams.q, status: searchParams.status }} />
    </>
  );
}

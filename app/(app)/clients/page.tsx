import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { requireWorkspace } from "@/lib/auth/session";
import { listClients, listIndustries } from "@/lib/db/clients";
import { PAGE_SIZE } from "@/lib/db/documents";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string; industry?: string; archived?: string; page?: string }> }) {
  const { membership } = await requireWorkspace();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const archived = sp.archived === "1";
  const [{ rows, total }, industries] = await Promise.all([
    listClients({ workspaceId: membership.workspaceId, q: sp.q, industry: sp.industry, archived, page }),
    listIndustries(membership.workspaceId),
  ]);
  const filtered = !!(sp.q || sp.industry || archived);

  return (
    <>
      <PageHeader title="Clients" description="Everyone you write documents for, with their proposals, quotations and audits in one place."
        actions={<Button asChild><Link href="/clients/new"><Plus className="size-4" aria-hidden />Add client</Link></Button>} />
      <form className="mb-5 flex flex-wrap gap-2" role="search">
        <div className="relative min-w-56 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-ink-faint" aria-hidden />
          <Input name="q" defaultValue={sp.q} placeholder="Search name, contact or email" aria-label="Search clients" className="pl-9" />
        </div>
        <Select name="industry" defaultValue={sp.industry ?? ""} aria-label="Filter by industry" className="w-44">
          <option value="">All industries</option>{industries.map((i) => <option key={i}>{i}</option>)}
        </Select>
        <Select name="archived" defaultValue={archived ? "1" : ""} aria-label="Show" className="w-36"><option value="">Active</option><option value="1">Archived</option></Select>
        <Button type="submit" variant="secondary">Apply</Button>
        {filtered && <Button asChild variant="ghost"><Link href="/clients">Clear</Link></Button>}
      </form>

      {rows.length === 0 ? (
        <EmptyState icon={Users} title={filtered ? "No clients match" : "No clients yet"}
          action={!filtered && <Button asChild><Link href="/clients/new">Add your first client</Link></Button>}>
          {filtered ? "Try a different search or clear the filters." : "Add a client to start writing proposals and quotations for them."}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-soft">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-line bg-paper/60 text-xs uppercase tracking-wider text-ink-faint">
              <tr><th className="px-4 py-2.5 font-medium">Client</th><th className="hidden px-4 py-2.5 font-medium sm:table-cell">Contact</th><th className="hidden px-4 py-2.5 font-medium md:table-cell">Industry</th><th className="px-4 py-2.5 font-medium">Email</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-paper/50">
                  <td className="px-4 py-3"><Link href={`/clients/${c.id}`} className="font-medium hover:underline">{c.company_name}</Link></td>
                  <td className="hidden px-4 py-3 text-ink-soft sm:table-cell">{c.contact_name ?? "-"}</td>
                  <td className="hidden px-4 py-3 md:table-cell">{c.industry ? <Badge>{c.industry}</Badge> : <span className="text-ink-faint">-</span>}</td>
                  <td className="px-4 py-3 text-ink-soft">{c.email ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/clients" params={{ q: sp.q, industry: sp.industry, archived: sp.archived }} />
    </>
  );
}

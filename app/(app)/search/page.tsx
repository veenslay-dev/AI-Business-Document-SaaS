import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DocStatusBadge } from "@/components/ui/status";
import { requireWorkspace } from "@/lib/auth/session";
import { likeTerm, documentHref, TYPE_LABEL } from "@/lib/db/documents";
import { createClient } from "@/lib/supabase/server";
import type { DocType } from "@/lib/documents/templates";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { membership } = await requireWorkspace();
  const q = ((await searchParams).q ?? "").trim();
  const supabase = await createClient();
  const term = likeTerm(q);
  const [clients, docs, projects] = q.length >= 2
    ? await Promise.all([
        supabase.from("clients").select("id, company_name, contact_name").eq("workspace_id", membership.workspaceId).or(`company_name.ilike.%${term}%,contact_name.ilike.%${term}%,email.ilike.%${term}%`).limit(10),
        supabase.from("documents").select("id, title, type, status").eq("workspace_id", membership.workspaceId).ilike("title", `%${term}%`).order("updated_at", { ascending: false }).limit(15),
        supabase.from("projects").select("id, name").eq("workspace_id", membership.workspaceId).ilike("name", `%${term}%`).limit(10),
      ])
    : [null, null, null];
  const nothing = q.length >= 2 && !clients?.data?.length && !docs?.data?.length && !projects?.data?.length;

  return (
    <>
      <PageHeader title="Search" />
      <form role="search" className="mb-8 flex max-w-lg gap-2">
        <Input name="q" defaultValue={q} placeholder="Client, document or project" aria-label="Search" autoFocus />
        <Button type="submit">Search</Button>
      </form>
      {q.length > 0 && q.length < 2 && <p className="text-sm text-ink-soft">Type at least 2 characters.</p>}
      {nothing && <EmptyState icon={Search} title={`No results for "${q}"`}>Check the spelling or try a shorter search.</EmptyState>}
      <div className="space-y-8">
        {!!clients?.data?.length && (
          <section><h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ink-faint">Clients</h2>
            <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">{clients.data.map((c) => (
              <li key={c.id}><Link href={`/clients/${c.id}`} className="block px-4 py-3 hover:bg-paper/50"><span className="font-medium">{c.company_name}</span> <span className="text-sm text-ink-soft">{c.contact_name}</span></Link></li>))}</ul></section>
        )}
        {!!docs?.data?.length && (
          <section><h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ink-faint">Documents</h2>
            <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">{docs.data.map((d) => (
              <li key={d.id}><Link href={documentHref(d.type as DocType, d.id)} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper/50">
                <span><span className="font-medium">{d.title}</span> <span className="text-sm text-ink-soft">{TYPE_LABEL[d.type as DocType]}</span></span><DocStatusBadge status={d.status} /></Link></li>))}</ul></section>
        )}
        {!!projects?.data?.length && (
          <section><h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ink-faint">Projects</h2>
            <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">{projects.data.map((p) => (
              <li key={p.id}><Link href={`/projects/${p.id}`} className="block px-4 py-3 font-medium hover:bg-paper/50">{p.name}</Link></li>))}</ul></section>
        )}
      </div>
    </>
  );
}

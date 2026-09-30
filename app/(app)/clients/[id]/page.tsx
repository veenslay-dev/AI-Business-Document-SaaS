import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, FolderKanban, Globe, Mail, Pencil, Phone, Plus } from "lucide-react";
import { ClientActions } from "@/components/clients/client-actions";
import { PageHeader } from "@/components/dashboard/page-header";
import { DocumentTable } from "@/components/documents/document-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProjectStatusBadge } from "@/components/ui/status";
import { requireWorkspace } from "@/lib/auth/session";
import { getClient, listProjects } from "@/lib/db/clients";
import { listActivity } from "@/lib/db/activity";
import { documentHref, listDocuments } from "@/lib/db/documents";
import { can } from "@/lib/permissions/roles";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Client" };
const TABS = [["overview", "Overview"], ["documents", "Documents"], ["projects", "Projects"], ["activity", "Activity"]] as const;

export default async function ClientDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { membership } = await requireWorkspace();
  const { id } = await params;
  const wanted = (await searchParams).tab;
  const tab = TABS.find(([k]) => k === wanted)?.[0] ?? "overview";
  const client = await getClient(membership.workspaceId, id);
  if (!client) notFound();
  const ws = membership.workspaceId;

  const [docs, projects, activity] = await Promise.all([
    listDocuments({ workspaceId: ws, clientId: id, pageSize: 50 }),
    listProjects({ workspaceId: ws, clientId: id }),
    tab === "activity" ? listActivity({ workspaceId: ws, clientId: id }) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader title={client.company_name}
        description={client.contact_name ?? undefined}
        actions={<div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary"><Link href={`/clients/${id}/edit`}><Pencil className="size-4" aria-hidden />Edit</Link></Button>
          <ClientActions id={id} archived={!!client.archived_at} canDelete={can(membership.role, "client:delete")} />
        </div>} />
      {client.archived_at && <div className="mb-4"><Badge tone="warn">Archived</Badge></div>}
      <dl className="mb-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-ink-soft">
        {client.email && <div className="flex items-center gap-1.5"><Mail className="size-4" aria-hidden /><a href={`mailto:${client.email}`} className="hover:text-ink">{client.email}</a></div>}
        {client.phone && <div className="flex items-center gap-1.5"><Phone className="size-4" aria-hidden />{client.phone}</div>}
        {client.website && <div className="flex items-center gap-1.5"><Globe className="size-4" aria-hidden /><a href={client.website} target="_blank" rel="noopener noreferrer" className="hover:text-ink">{client.website.replace(/^https?:\/\//, "")}</a></div>}
      </dl>

      <nav aria-label="Client sections" className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/clients/${id}?tab=${k}`} aria-current={tab === k ? "page" : undefined}
            className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm", tab === k ? "border-brand font-medium" : "border-transparent text-ink-soft hover:text-ink")}>
            {label}{k === "documents" && docs.total > 0 && <span className="ml-1.5 text-xs text-ink-faint">{docs.total}</span>}
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-line bg-surface p-5 shadow-soft">
            <h2 className="mb-3 font-semibold">Details</h2>
            <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-sm">
              {[["Industry", client.industry], ["GST", client.gst_number], ["Address", client.address], ["Notes", client.notes]].map(([k, v]) => (
                <div key={k} className="contents"><dt className="text-ink-faint">{k}</dt><dd className="whitespace-pre-line">{v || "-"}</dd></div>
              ))}
            </dl>
          </section>
          <section className="rounded-lg border border-line bg-surface p-5 shadow-soft">
            <h2 className="mb-3 font-semibold">Start a document</h2>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary"><Link href={`/proposals/new?client=${id}`}>New proposal</Link></Button>
              <Button asChild variant="secondary"><Link href={`/quotations/new?client=${id}`}>New quotation</Link></Button>
              <Button asChild variant="secondary"><Link href={`/seo-audits/new?client=${id}`}>New SEO audit</Link></Button>
            </div>
            <p className="mt-4 text-sm text-ink-soft">{docs.total} document{docs.total === 1 ? "" : "s"} · {projects.total} project{projects.total === 1 ? "" : "s"}</p>
          </section>
        </div>
      )}

      {tab === "documents" && (docs.rows.length === 0
        ? <EmptyState icon={FileText} title="No documents for this client yet" action={<Button asChild><Link href={`/proposals/new?client=${id}`}>Create a proposal</Link></Button>}>Proposals, quotations and audits you create for {client.company_name} will be listed here.</EmptyState>
        : <DocumentTable rows={docs.rows} canDelete={can(membership.role, "document:delete")} hideClient />)}

      {tab === "projects" && (
        <>
          <div className="mb-4 flex justify-end"><Button asChild variant="secondary"><Link href={`/projects/new?client=${id}`}><Plus className="size-4" aria-hidden />Add project</Link></Button></div>
          {projects.rows.length === 0 ? <EmptyState icon={FolderKanban} title="No projects yet">Group related documents under a project for this client.</EmptyState> : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface shadow-soft">
              {projects.rows.map((p) => (
                <li key={p.id}><Link href={`/projects/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper/50">
                  <span className="font-medium">{p.name}</span><ProjectStatusBadge status={p.status} /></Link></li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === "activity" && (activity.length === 0
        ? <EmptyState icon={FileText} title="No activity yet">You'll see when this client opens, accepts or comments on a document.</EmptyState>
        : <ul className="divide-y divide-line rounded-lg border border-line bg-surface shadow-soft">
            {activity.map((a) => (
              <li key={a.id} className="px-4 py-3 text-sm">
                <Link href={documentHref(a.type, a.documentId)} className="font-medium hover:underline">{a.title}</Link> {a.text}
                {a.detail && <p className="mt-1 rounded bg-paper px-3 py-2 text-ink-soft">{a.detail}</p>}
                <p className="mt-0.5 text-xs text-ink-faint">{timeAgo(a.at)}</p>
              </li>
            ))}
          </ul>)}
    </>
  );
}

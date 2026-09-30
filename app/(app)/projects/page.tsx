import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ProjectStatusBadge } from "@/components/ui/status";
import { requireWorkspace } from "@/lib/auth/session";
import { clientOptions, listProjects } from "@/lib/db/clients";
import { PAGE_SIZE } from "@/lib/db/documents";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { membership } = await requireWorkspace();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [{ rows, total }, clients] = await Promise.all([listProjects({ workspaceId: membership.workspaceId, page }), clientOptions(membership.workspaceId)]);
  return (
    <>
      <PageHeader title="Projects" description="Group a client's documents by engagement."
        actions={clients.length > 0 && <Button asChild><Link href="/projects/new"><Plus className="size-4" aria-hidden />New project</Link></Button>} />
      {rows.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects yet"
          action={<Button asChild><Link href={clients.length ? "/projects/new" : "/clients/new"}>{clients.length ? "Create a project" : "Add a client first"}</Link></Button>}>
          Projects belong to a client. {clients.length ? "Create one to keep related work together." : "Add your first client to get started."}
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface shadow-soft">
          {rows.map((p) => (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-paper/50">
                <div><p className="font-medium">{p.name}</p><p className="text-sm text-ink-soft">{p.client_name}</p></div>
                <ProjectStatusBadge status={p.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/projects" />
    </>
  );
}

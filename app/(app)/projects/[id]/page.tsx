import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { requireWorkspace } from "@/lib/auth/session";
import { clientOptions, getProject } from "@/lib/db/clients";
import { can } from "@/lib/permissions/roles";
import { PROJECT_STATUSES } from "@/lib/validation/crm";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { membership } = await requireWorkspace();
  const p = await getProject(membership.workspaceId, (await params).id);
  if (!p) notFound();
  const clients = await clientOptions(membership.workspaceId);
  return (
    <>
      <PageHeader title={p.name} />
      <ProjectForm projectId={p.id} canDelete={can(membership.role, "client:delete")} clients={clients}
        defaults={{ clientId: p.client_id, name: p.name, description: p.description ?? "", status: (PROJECT_STATUSES as readonly string[]).includes(p.status) ? (p.status as (typeof PROJECT_STATUSES)[number]) : "planned" }} />
    </>
  );
}

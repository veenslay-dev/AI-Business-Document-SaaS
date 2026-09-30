import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { requireWorkspace } from "@/lib/auth/session";
import { clientOptions } from "@/lib/db/clients";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { membership } = await requireWorkspace();
  const clients = await clientOptions(membership.workspaceId);
  if (clients.length === 0) redirect("/clients/new");
  const preset = (await searchParams).client;
  return (
    <>
      <PageHeader title="New project" />
      <ProjectForm clients={clients} defaults={{ clientId: clients.some((c) => c.id === preset) ? preset! : "", name: "", description: "", status: "planned" }} />
    </>
  );
}

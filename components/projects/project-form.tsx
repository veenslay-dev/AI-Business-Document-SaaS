"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { createProjectAction, deleteProjectAction, updateProjectAction } from "@/lib/actions/clients";
import { projectSchema, PROJECT_STATUSES, type ProjectInput, type ProjectOutput } from "@/lib/validation/crm";

const LABEL: Record<string, string> = { planned: "Planned", active: "Active", on_hold: "On hold", completed: "Completed", cancelled: "Cancelled" };

export function ProjectForm({ projectId, defaults, clients, canDelete = false }: {
  projectId?: string; defaults: ProjectInput; clients: { id: string; name: string }[]; canDelete?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<ProjectInput, unknown, ProjectOutput>({ resolver: zodResolver(projectSchema), defaultValues: defaults });

  const onSubmit = handleSubmit(() => {
    setError(null);
    start(async () => {
      try {
        const values = getValues();
        const res = projectId ? await updateProjectAction(projectId, values) : await createProjectAction(values);
        if (res.ok) { toast.success(res.message ?? "Saved."); router.push("/projects"); router.refresh(); }
        else setError(res.error);
      } catch { setError("We couldn't reach the server. Check your connection and try again."); }
    });
  });

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5" noValidate>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <Field label="Client" htmlFor="clientId" error={errors.clientId?.message}>
        <Select id="clientId" {...register("clientId")}>
          <option value="">Choose a client</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label="Project name" htmlFor="name" error={errors.name?.message}><Input id="name" {...register("name")} /></Field>
      <Field label="Status" htmlFor="status"><Select id="status" {...register("status")}>{PROJECT_STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}</Select></Field>
      <Field label="Description" htmlFor="description" error={errors.description?.message}><Textarea id="description" rows={4} {...register("description")} /></Field>
      <div className="flex items-center gap-2">
        <Button type="submit" loading={pending}>{projectId ? "Save project" : "Create project"}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>Cancel</Button>
        {projectId && canDelete && (
          <ConfirmButton variant="ghost" className="ml-auto text-signal hover:text-signal" title="Delete this project?" description="Documents linked to it are kept."
            action={() => deleteProjectAction(projectId)} onDone={() => router.push("/projects")}>Delete</ConfirmButton>
        )}
      </div>
    </form>
  );
}

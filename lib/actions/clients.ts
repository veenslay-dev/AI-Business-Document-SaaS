"use server";

import { revalidatePath } from "next/cache";
import { clientSchema, projectSchema, uuid, type ClientInput, type ProjectInput } from "@/lib/validation/crm";
import { actionContext } from "./context";
import { fail, fromZod, GENERIC_ERROR, type ActionResult } from "./result";

const toRow = (v: ReturnType<typeof clientSchema.parse>) => ({
  company_name: v.companyName, contact_name: v.contactName, email: v.email, phone: v.phone, website: v.website,
  industry: v.industry, address: v.address, gst_number: v.gstNumber, notes: v.notes,
});

export async function createClientAction(input: ClientInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await actionContext();
  if (!ctx.ok) return ctx.error;
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { data, error } = await ctx.supabase.from("clients").insert({ ...toRow(parsed.data), workspace_id: ctx.workspaceId }).select("id").single();
  if (error || !data) return fail(GENERIC_ERROR);
  revalidatePath("/clients");
  return { ok: true, data: { id: data.id }, message: "Client added." };
}

export async function updateClientAction(id: string, input: ClientInput): Promise<ActionResult> {
  const ctx = await actionContext();
  if (!ctx.ok) return ctx.error;
  if (!uuid.safeParse(id).success) return fail("That client no longer exists.");
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { data, error } = await ctx.supabase.from("clients").update(toRow(parsed.data)).eq("id", id).eq("workspace_id", ctx.workspaceId).select("id");
  if (error) return fail(GENERIC_ERROR);
  if (!data?.length) return fail("That client no longer exists.");
  revalidatePath("/clients", "layout");
  return { ok: true, message: "Client saved." };
}

export async function archiveClientAction(id: string, archive: boolean): Promise<ActionResult> {
  const ctx = await actionContext();
  if (!ctx.ok) return ctx.error;
  if (!uuid.safeParse(id).success) return fail("That client no longer exists.");
  const { data, error } = await ctx.supabase.from("clients").update({ archived_at: archive ? new Date().toISOString() : null })
    .eq("id", id).eq("workspace_id", ctx.workspaceId).select("id");
  if (error) return fail(GENERIC_ERROR);
  if (!data?.length) return fail("That client no longer exists.");
  revalidatePath("/clients", "layout");
  return { ok: true, message: archive ? "Client archived." : "Client restored." };
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  const ctx = await actionContext("client:delete");
  if (!ctx.ok) return ctx.error;
  if (!uuid.safeParse(id).success) return fail("That client no longer exists.");
  const { error } = await ctx.supabase.from("clients").delete().eq("id", id).eq("workspace_id", ctx.workspaceId);
  if (error) return fail(GENERIC_ERROR);
  revalidatePath("/clients", "layout");
  return { ok: true, message: "Client deleted. Their documents were kept." };
}

const projectRow = (v: ReturnType<typeof projectSchema.parse>) => ({ client_id: v.clientId, name: v.name, description: v.description, status: v.status });

export async function createProjectAction(input: ProjectInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await actionContext();
  if (!ctx.ok) return ctx.error;
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  // The composite foreign key rejects a client from another workspace.
  const { data, error } = await ctx.supabase.from("projects").insert({ ...projectRow(parsed.data), workspace_id: ctx.workspaceId }).select("id").single();
  if (error || !data) return fail(error?.code === "23503" ? "Choose one of your clients." : GENERIC_ERROR);
  revalidatePath("/projects");
  revalidatePath("/clients", "layout");
  return { ok: true, data: { id: data.id }, message: "Project created." };
}

export async function updateProjectAction(id: string, input: ProjectInput): Promise<ActionResult> {
  const ctx = await actionContext();
  if (!ctx.ok) return ctx.error;
  if (!uuid.safeParse(id).success) return fail("That project no longer exists.");
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { data, error } = await ctx.supabase.from("projects").update(projectRow(parsed.data)).eq("id", id).eq("workspace_id", ctx.workspaceId).select("id");
  if (error) return fail(error.code === "23503" ? "Choose one of your clients." : GENERIC_ERROR);
  if (!data?.length) return fail("That project no longer exists.");
  revalidatePath("/projects", "layout");
  revalidatePath("/clients", "layout");
  return { ok: true, message: "Project saved." };
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  const ctx = await actionContext("client:delete");
  if (!ctx.ok) return ctx.error;
  if (!uuid.safeParse(id).success) return fail("That project no longer exists.");
  const { error } = await ctx.supabase.from("projects").delete().eq("id", id).eq("workspace_id", ctx.workspaceId);
  if (error) return fail(GENERIC_ERROR);
  revalidatePath("/projects", "layout");
  return { ok: true, message: "Project deleted." };
}

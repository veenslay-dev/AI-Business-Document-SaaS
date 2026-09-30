"use server";

import { revalidatePath } from "next/cache";
import { getSystemTemplate, outlineOf, DEFAULT_TEMPLATE_KEY } from "@/lib/documents/templates";
import { parseContent } from "@/lib/documents/content";
import { fetchDocument, loadTemplateConfig } from "@/lib/db/render";
import { packageSchema, knowledgeSchema, templateNameSchema, type KnowledgeInput, type PackageInput } from "@/lib/validation/config";
import { uuid } from "@/lib/validation/crm";
import { actionContext } from "./context";
import { fail, fromZod, GENERIC_ERROR, type ActionResult } from "./result";

// ---- Templates
/** Saves a document's layout (template settings and section titles) as a reusable workspace template. */
export async function saveAsTemplateAction(documentId: string, name: string): Promise<ActionResult<{ id: string }>> {
  const ctx = await actionContext("document:create");
  if (!ctx.ok) return ctx.error;
  const n = templateNameSchema.safeParse(name);
  if (!n.success) return fail(n.error.issues[0].message);
  const doc = await fetchDocument(ctx.supabase, ctx.workspaceId, documentId);
  if (!doc) return fail("This document no longer exists.");
  const content = parseContent(doc.content_json);
  if (!content) return fail("This document's content couldn't be read.");
  const config = await loadTemplateConfig(ctx.supabase, doc);
  const { data, error } = await ctx.supabase.from("document_templates").insert({
    workspace_id: ctx.workspaceId, name: n.data, type: doc.type, template_config: { config, outline: outlineOf(content) }, is_default: false,
  }).select("id").single();
  if (error || !data) return fail(GENERIC_ERROR);
  revalidatePath("/templates");
  return { ok: true, data: { id: data.id }, message: "Saved as a template. It's now in your template list." };
}

export async function setDefaultTemplateAction(id: string | null, type: string): Promise<ActionResult> {
  const ctx = await actionContext("company:update");
  if (!ctx.ok) return ctx.error;
  if (id !== null && !uuid.safeParse(id).success) return fail("That template no longer exists.");
  await ctx.supabase.from("document_templates").update({ is_default: false }).eq("workspace_id", ctx.workspaceId).eq("type", type);
  if (id) {
    const { data, error } = await ctx.supabase.from("document_templates").update({ is_default: true }).eq("id", id).eq("workspace_id", ctx.workspaceId).eq("type", type).select("id");
    if (error || !data?.length) return fail("That template no longer exists.");
  }
  revalidatePath("/templates");
  return { ok: true, message: id ? "Default template updated." : `Default reset to the built-in ${getSystemTemplate(DEFAULT_TEMPLATE_KEY[type as keyof typeof DEFAULT_TEMPLATE_KEY])?.name ?? "template"}.` };
}

export async function deleteTemplateAction(id: string): Promise<ActionResult> {
  const ctx = await actionContext("company:update");
  if (!ctx.ok) return ctx.error;
  if (!uuid.safeParse(id).success) return fail("That template no longer exists.");
  const { error } = await ctx.supabase.from("document_templates").delete().eq("id", id).eq("workspace_id", ctx.workspaceId);
  if (error) return fail(GENERIC_ERROR);
  revalidatePath("/templates");
  return { ok: true, message: "Template deleted. Documents that used it fall back to the built-in layout." };
}

// ---- Pricing packages
const pkgRow = (v: ReturnType<typeof packageSchema.parse>) => ({ tier: v.tier, name: v.name, description: v.description, price: v.price, currency: v.currency, features: v.features });

export async function savePackageAction(id: string | null, input: PackageInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await actionContext("document:create");
  if (!ctx.ok) return ctx.error;
  const parsed = packageSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  if (id) {
    if (!uuid.safeParse(id).success) return fail("That package no longer exists.");
    const { data, error } = await ctx.supabase.from("pricing_packages").update(pkgRow(parsed.data)).eq("id", id).eq("workspace_id", ctx.workspaceId).select("id");
    if (error || !data?.length) return fail("That package no longer exists.");
    revalidatePath("/templates");
    return { ok: true, data: { id }, message: "Package saved." };
  }
  const order = { basic: 1, standard: 2, premium: 3, custom: 4 }[parsed.data.tier];
  const { data, error } = await ctx.supabase.from("pricing_packages").insert({ ...pkgRow(parsed.data), workspace_id: ctx.workspaceId, sort_order: order }).select("id").single();
  if (error || !data) return fail(GENERIC_ERROR);
  revalidatePath("/templates");
  return { ok: true, data: { id: data.id }, message: "Package added." };
}

export async function deletePackageAction(id: string): Promise<ActionResult> {
  const ctx = await actionContext("document:create");
  if (!ctx.ok) return ctx.error;
  if (!uuid.safeParse(id).success) return fail("That package no longer exists.");
  const { error } = await ctx.supabase.from("pricing_packages").delete().eq("id", id).eq("workspace_id", ctx.workspaceId);
  if (error) return fail(GENERIC_ERROR);
  revalidatePath("/templates");
  return { ok: true, message: "Package deleted." };
}

// ---- Knowledge base
export async function saveKnowledgeAction(id: string | null, input: KnowledgeInput): Promise<ActionResult> {
  const ctx = await actionContext("document:create");
  if (!ctx.ok) return ctx.error;
  const parsed = knowledgeSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  if (id) {
    if (!uuid.safeParse(id).success) return fail("That entry no longer exists.");
    const { data, error } = await ctx.supabase.from("knowledge_base_items").update(parsed.data).eq("id", id).eq("workspace_id", ctx.workspaceId).select("id");
    if (error || !data?.length) return fail("That entry no longer exists.");
  } else {
    const { error } = await ctx.supabase.from("knowledge_base_items").insert({ ...parsed.data, workspace_id: ctx.workspaceId });
    if (error) return fail(GENERIC_ERROR);
  }
  revalidatePath("/settings/knowledge");
  return { ok: true, message: "Saved to your knowledge base." };
}

export async function deleteKnowledgeAction(id: string): Promise<ActionResult> {
  const ctx = await actionContext("document:create");
  if (!ctx.ok) return ctx.error;
  if (!uuid.safeParse(id).success) return fail("That entry no longer exists.");
  const { error } = await ctx.supabase.from("knowledge_base_items").delete().eq("id", id).eq("workspace_id", ctx.workspaceId);
  if (error) return fail(GENERIC_ERROR);
  revalidatePath("/settings/knowledge");
  return { ok: true, message: "Entry deleted." };
}

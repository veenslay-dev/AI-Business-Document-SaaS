"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { withinDocumentLimit } from "@/lib/billing/plans";
import { buildInvoiceContent, buildProposalContent, buildQuotationContent, formatQuotationNumber, type ClientInfo } from "@/lib/documents/builders";
import { parseContent } from "@/lib/documents/content";
import { documentTotals } from "@/lib/documents/totals";
import { applyOutline, DEFAULT_TEMPLATE_KEY, getSystemTemplate, type DocType, type SectionOutline } from "@/lib/documents/templates";
import { fetchDocument, loadLiveBrand } from "@/lib/db/render";
import { documentHref } from "@/lib/db/documents";
import { invoiceFormSchema, proposalFormSchema, quotationFormSchema, saveDocumentSchema, type InvoiceFormInput, type ProposalFormInput, type QuotationFormInput, type SaveDocumentInput } from "@/lib/validation/documents";
import { uuid } from "@/lib/validation/crm";
import { siteUrl } from "@/lib/utils";
import { actionContext } from "./context";
import { fail, fromZod, GENERIC_ERROR, type ActionResult } from "./result";

type Ctx = Extract<Awaited<ReturnType<typeof actionContext>>, { ok: true }>;

const splitLines = (t: string) => t.split(/\r?\n/).map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim()).filter(Boolean).slice(0, 40);

async function loadClientInfo(ctx: Ctx, clientId: string): Promise<{ info: ClientInfo; name: string } | null> {
  const { data } = await ctx.supabase.from("clients").select("company_name, contact_name, email, phone, address")
    .eq("id", clientId).eq("workspace_id", ctx.workspaceId).maybeSingle();
  if (!data) return null;
  return { name: data.company_name, info: { company: data.company_name, contact: data.contact_name ?? "", email: data.email ?? "", phone: data.phone ?? "", address: data.address ?? "" } };
}

async function underPlanLimit(ctx: Ctx): Promise<boolean> {
  const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
  const [{ data: sub }, { count }] = await Promise.all([
    ctx.supabase.from("subscriptions").select("plan").eq("workspace_id", ctx.workspaceId).maybeSingle(),
    ctx.supabase.from("documents").select("id", { count: "exact", head: true }).eq("workspace_id", ctx.workspaceId).gte("created_at", start.toISOString()),
  ]);
  return withinDocumentLimit(sub?.plan, count ?? 0);
}

/** Resolves a template choice to columns to store, verifying custom templates belong to the workspace. */
async function resolveTemplate(ctx: Ctx, type: DocType, key: string, templateId: string | null) {
  if (templateId) {
    const { data } = await ctx.supabase.from("document_templates").select("id, type, template_config").eq("id", templateId).eq("workspace_id", ctx.workspaceId).maybeSingle();
    if (data && data.type === type) return { template_id: data.id as string, template_key: null as string | null, outline: ((data.template_config as { outline?: SectionOutline })?.outline ?? null) };
  }
  const sys = getSystemTemplate(key);
  return { template_id: null, template_key: sys && sys.type === type ? sys.key : DEFAULT_TEMPLATE_KEY[type], outline: null };
}

export async function createProposalAction(input: ProposalFormInput): Promise<ActionResult<{ id: string; href: string }>> {
  const ctx = await actionContext("document:create");
  if (!ctx.ok) return ctx.error;
  const parsed = proposalFormSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;

  if (!(await underPlanLimit(ctx))) return fail("You've reached this month's document limit on your plan.");
  const client = await loadClientInfo(ctx, v.clientId);
  if (!client) return fail("Choose one of your clients.");
  const brand = await loadLiveBrand(ctx.supabase, ctx.workspaceId);
  if (!brand) return fail("We couldn't load your company profile. Refresh and try again.");

  let packages: { name: string; price: number; description: string; features: string[]; selected: boolean }[] = [];
  if (v.packageIds.length) {
    const { data } = await ctx.supabase.from("pricing_packages").select("id, name, price, description, features, sort_order")
      .eq("workspace_id", ctx.workspaceId).in("id", v.packageIds).order("sort_order");
    packages = (data ?? []).map((p) => ({
      name: p.name, price: Number(p.price), description: p.description ?? "",
      features: Array.isArray(p.features) ? (p.features as string[]) : [], selected: p.id === v.selectedPackageId,
    }));
  }

  const tpl = await resolveTemplate(ctx, "proposal", v.templateKey, v.templateId);
  let content = buildProposalContent({
    brand, client: client.info, ai: v.ai, packages, date: new Date().toISOString().slice(0, 10),
    input: { title: v.title, description: v.description, goals: v.goals, requirements: v.requirements, services: v.services, timeline: v.timeline, budget: v.budget, notes: v.notes, currency: v.currency },
  });
  if (tpl.outline) content = { ...content, sections: applyOutline(content.sections, tpl.outline) };

  const totals = documentTotals(content);
  const { data, error } = await ctx.supabase.from("documents").insert({
    workspace_id: ctx.workspaceId, client_id: v.clientId, type: "proposal", title: v.ai?.title || v.title, status: "draft",
    content_json: content, template_id: tpl.template_id, template_key: tpl.template_key,
    total_amount: totals.amount, currency: totals.currency, created_by: ctx.user.id,
  }).select("id").single();
  if (error || !data) return fail(GENERIC_ERROR);
  revalidatePath("/proposals"); revalidatePath("/dashboard");
  return { ok: true, data: { id: data.id, href: documentHref("proposal", data.id) } };
}

export async function createQuotationAction(input: QuotationFormInput): Promise<ActionResult<{ id: string; href: string }>> {
  const ctx = await actionContext("document:create");
  if (!ctx.ok) return ctx.error;
  const parsed = quotationFormSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;

  if (!(await underPlanLimit(ctx))) return fail("You've reached this month's document limit on your plan.");
  const client = await loadClientInfo(ctx, v.clientId);
  if (!client) return fail("Choose one of your clients.");
  const brand = await loadLiveBrand(ctx.supabase, ctx.workspaceId);
  if (!brand) return fail("We couldn't load your company profile. Refresh and try again.");

  const year = Number(v.issueDate.slice(0, 4)) || new Date().getUTCFullYear();
  const { count } = await ctx.supabase.from("documents").select("id", { count: "exact", head: true })
    .eq("workspace_id", ctx.workspaceId).eq("type", "quotation").gte("created_at", `${year}-01-01`);
  const number = formatQuotationNumber(year, (count ?? 0) + 1);

  const tpl = await resolveTemplate(ctx, "quotation", v.templateKey, v.templateId);
  const content = buildQuotationContent({
    brand, client: client.info, number, issueDate: v.issueDate, validUntil: v.validUntil, currency: v.currency,
    taxLabel: v.taxLabel, taxRate: v.taxRate, notes: v.notes, title: v.title || `Quotation for ${client.name}`,
    scope: { overview: v.overview, scope: splitLines(v.scope), deliverables: splitLines(v.deliverables), timeline: v.timeline },
    items: [{ kind: "item", id: `i${Date.now().toString(36)}`, name: "", description: "", quantity: 1, unit: "", unitPrice: 0, discountType: "percent", discount: 0, taxRate: null }],
  });
  const totals = documentTotals(content);
  const { data, error } = await ctx.supabase.from("documents").insert({
    workspace_id: ctx.workspaceId, client_id: v.clientId, type: "quotation", title: content.cover.title, status: "draft",
    content_json: content, template_id: tpl.template_id, template_key: tpl.template_key,
    total_amount: totals.amount, currency: totals.currency, created_by: ctx.user.id,
  }).select("id").single();
  if (error || !data) return fail(GENERIC_ERROR);
  revalidatePath("/quotations"); revalidatePath("/dashboard");
  return { ok: true, data: { id: data.id, href: documentHref("quotation", data.id) } };
}

export async function createInvoiceAction(input: InvoiceFormInput): Promise<ActionResult<{ id: string; href: string }>> {
  const ctx = await actionContext("document:create");
  if (!ctx.ok) return ctx.error;
  const parsed = invoiceFormSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;

  if (!(await underPlanLimit(ctx))) return fail("You've reached this month's document limit on your plan.");
  const client = await loadClientInfo(ctx, v.clientId);
  if (!client) return fail("Choose one of your clients.");
  const brand = await loadLiveBrand(ctx.supabase, ctx.workspaceId);
  if (!brand) return fail("We couldn't load your company profile. Refresh and try again.");

  const year = Number(v.issueDate.slice(0, 4)) || new Date().getUTCFullYear();
  const { count } = await ctx.supabase.from("documents").select("id", { count: "exact", head: true })
    .eq("workspace_id", ctx.workspaceId).eq("type", "invoice").gte("created_at", `${year}-01-01`);
  const number = formatQuotationNumber(year, (count ?? 0) + 1, "INV");

  const tpl = await resolveTemplate(ctx, "invoice", v.templateKey, v.templateId);
  const content = buildInvoiceContent({
    brand, client: client.info, number, issueDate: v.issueDate, dueDate: v.dueDate, currency: v.currency,
    taxLabel: v.taxLabel, taxRate: v.taxRate, notes: v.notes, paymentDetails: v.paymentDetails,
    title: v.title || `Invoice for ${client.name}`,
    items: [{ kind: "item", id: `i${Date.now().toString(36)}`, name: "", description: "", quantity: 1, unit: "", unitPrice: 0, discountType: "percent", discount: 0, taxRate: null }],
  });
  const totals = documentTotals(content);
  const { data, error } = await ctx.supabase.from("documents").insert({
    workspace_id: ctx.workspaceId, client_id: v.clientId, type: "invoice", title: content.cover.title, status: "draft",
    content_json: content, template_id: tpl.template_id, template_key: tpl.template_key,
    total_amount: totals.amount, currency: totals.currency, created_by: ctx.user.id,
  }).select("id").single();
  if (error || !data) return fail(GENERIC_ERROR);
  revalidatePath("/invoices"); revalidatePath("/dashboard");
  return { ok: true, data: { id: data.id, href: documentHref("invoice", data.id) } };
}

const LOCKED = ["accepted", "rejected"];

export async function saveDocumentAction(input: SaveDocumentInput): Promise<ActionResult<{ updatedAt: string }>> {
  const ctx = await actionContext("document:create");
  if (!ctx.ok) return ctx.error;
  const parsed = saveDocumentSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;

  const doc = await fetchDocument(ctx.supabase, ctx.workspaceId, v.id);
  if (!doc) return fail("This document no longer exists.");
  if (LOCKED.includes(doc.status)) return fail(`This document was ${doc.status} by the client and can't be edited. Duplicate it to make changes.`);

  const template = v.templateId
    ? await resolveTemplate(ctx, doc.type, "", v.templateId)
    : await resolveTemplate(ctx, doc.type, v.templateKey ?? "", null);
  const totals = documentTotals(v.content);
  const { data, error } = await ctx.supabase.from("documents").update({
    title: v.title, content_json: v.content, template_id: template.template_id, template_key: template.template_key,
    total_amount: totals.amount, currency: totals.currency,
  }).eq("id", v.id).eq("workspace_id", ctx.workspaceId).select("updated_at").single();
  if (error || !data) return fail(GENERIC_ERROR);
  revalidatePath("/", "layout");
  return { ok: true, data: { updatedAt: data.updated_at } };
}

/** Replaces the frozen brand of a shared document with the current brand kit. The client will see the new look. */
export async function refreshBrandingAction(id: string): Promise<ActionResult> {
  const ctx = await actionContext("document:create");
  if (!ctx.ok) return ctx.error;
  const doc = await fetchDocument(ctx.supabase, ctx.workspaceId, id);
  if (!doc) return fail("This document no longer exists.");
  if (LOCKED.includes(doc.status)) return fail(`This document was ${doc.status} by the client, so its look is kept as they saw it.`);
  const brand = await loadLiveBrand(ctx.supabase, ctx.workspaceId);
  if (!brand) return fail("We couldn't load your brand kit. Refresh and try again.");
  const { error } = await ctx.supabase.from("documents").update({ brand_snapshot: brand }).eq("id", id).eq("workspace_id", ctx.workspaceId);
  if (error) return fail(GENERIC_ERROR);
  revalidatePath("/", "layout");
  return { ok: true, message: "Branding refreshed from your brand kit." };
}

/**
 * Makes a document shareable. The first time, the current company profile and brand kit
 * are frozen into brand_snapshot so later brand changes don't alter this document.
 */
export async function shareDocumentAction(id: string, opts: { expiresInDays?: number | null } = {}): Promise<ActionResult<{ url: string; status: string }>> {
  const ctx = await actionContext("document:create");
  if (!ctx.ok) return ctx.error;
  const doc = await fetchDocument(ctx.supabase, ctx.workspaceId, id);
  if (!doc) return fail("This document no longer exists.");
  const content = parseContent(doc.content_json);
  if (!content) return fail("This document's content is damaged. Duplicate it or start a new one.");

  const patch: Record<string, unknown> = {};
  if (!doc.brand_snapshot) {
    const brand = await loadLiveBrand(ctx.supabase, ctx.workspaceId);
    if (!brand) return fail("We couldn't load your brand kit. Refresh and try again.");
    patch.brand_snapshot = brand;
    patch.finalized_at = new Date().toISOString();
  }
  if (doc.status === "draft") patch.status = "sent";
  if (opts.expiresInDays && opts.expiresInDays > 0 && opts.expiresInDays <= 365) {
    patch.expires_at = new Date(Date.now() + opts.expiresInDays * 86_400_000).toISOString();
  } else if (opts.expiresInDays === null) {
    patch.expires_at = null;
  }
  if (Object.keys(patch).length) {
    const { error } = await ctx.supabase.from("documents").update(patch).eq("id", id).eq("workspace_id", ctx.workspaceId);
    if (error) return fail(GENERIC_ERROR);
  }
  revalidatePath("/", "layout");
  return { ok: true, data: { url: `${siteUrl()}/view/p/${doc.public_token}`, status: (patch.status as string) ?? doc.status } };
}

/** Invalidates the old public link and issues a new one. */
export async function regenerateLinkAction(id: string): Promise<ActionResult<{ url: string }>> {
  const ctx = await actionContext("document:create");
  if (!ctx.ok) return ctx.error;
  if (!uuid.safeParse(id).success) return fail("This document no longer exists.");
  const token = randomBytes(24).toString("hex");
  const { data, error } = await ctx.supabase.from("documents").update({ public_token: token }).eq("id", id).eq("workspace_id", ctx.workspaceId).select("id");
  if (error) return fail(GENERIC_ERROR);
  if (!data?.length) return fail("This document no longer exists.");
  revalidatePath("/", "layout");
  return { ok: true, data: { url: `${siteUrl()}/view/p/${token}` }, message: "New link created. The old link no longer works." };
}

export async function duplicateDocumentAction(id: string): Promise<ActionResult<{ id: string; href: string }>> {
  const ctx = await actionContext("document:create");
  if (!ctx.ok) return ctx.error;
  if (!(await underPlanLimit(ctx))) return fail("You've reached this month's document limit on your plan.");
  const doc = await fetchDocument(ctx.supabase, ctx.workspaceId, id);
  if (!doc) return fail("This document no longer exists.");
  const { data, error } = await ctx.supabase.from("documents").insert({
    workspace_id: ctx.workspaceId, client_id: doc.client_id, type: doc.type, title: `${doc.title} (copy)`.slice(0, 200), status: "draft",
    content_json: doc.content_json, template_id: doc.template_id, template_key: doc.template_key,
    total_amount: doc.total_amount, currency: doc.currency, created_by: ctx.user.id,
  }).select("id").single();
  if (error || !data) return fail(GENERIC_ERROR);
  revalidatePath("/", "layout");
  return { ok: true, data: { id: data.id, href: documentHref(doc.type, data.id) }, message: "Duplicated as a new draft." };
}

export async function deleteDocumentAction(id: string): Promise<ActionResult> {
  const ctx = await actionContext("document:delete");
  if (!ctx.ok) return ctx.error;
  if (!uuid.safeParse(id).success) return fail("This document no longer exists.");
  const { error } = await ctx.supabase.from("documents").delete().eq("id", id).eq("workspace_id", ctx.workspaceId);
  if (error) return fail(GENERIC_ERROR);
  revalidatePath("/", "layout");
  return { ok: true, message: "Document deleted." };
}


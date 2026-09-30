"use server";

import { z } from "zod";
import { generateFollowUp, generateProposal, generateQuotationDescription, improveDocumentContent } from "@/lib/ai/functions";
import { assistCommandSchema, type ProposalAi } from "@/lib/ai/schemas";
import { withAi } from "@/lib/ai/service";
import { CURRENCIES } from "@/lib/documents/content";
import { actionContext } from "./context";
import { fail, fromZod, type ActionResult } from "./result";

const assistSchema = z.object({
  command: assistCommandSchema,
  text: z.string().max(8000),
  documentTitle: z.string().max(200).default(""),
});

/** Editor assistant: rewrite or generate text for one block or section. */
export async function assistAction(input: z.input<typeof assistSchema>): Promise<ActionResult<{ content: string }>> {
  const ctx = await actionContext("document:create");
  if (!ctx.ok) return ctx.error;
  const parsed = assistSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;
  return withAi("assist", async (ai) => ({
    content: await improveDocumentContent(ai.provider, ai.brand, { command: v.command, text: v.text, documentTitle: v.documentTitle }, await ai.knowledge(`${v.documentTitle} ${v.text}`)),
  }));
}

const proposalInputSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().trim().min(3).max(200),
  description: z.string().max(4000).default(""),
  goals: z.string().max(4000).default(""),
  requirements: z.string().max(4000).default(""),
  services: z.array(z.string().max(200)).max(30).default([]),
  timeline: z.string().max(400).default(""),
  budget: z.string().max(200).default(""),
  currency: z.enum(CURRENCIES).default("INR"),
  notes: z.string().max(4000).default(""),
  audience: z.enum(["us", "india", "global"]).default("global"),
});

/** Builder step 3: structured proposal content, validated against the Zod schema before it reaches the browser. */
export async function generateProposalAction(input: z.input<typeof proposalInputSchema>): Promise<ActionResult<ProposalAi>> {
  const ctx = await actionContext("document:create");
  if (!ctx.ok) return ctx.error;
  const parsed = proposalInputSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;
  const { data: client } = await ctx.supabase.from("clients").select("company_name, industry").eq("id", v.clientId).eq("workspace_id", ctx.workspaceId).maybeSingle();
  if (!client) return fail("Choose one of your clients.");
  return withAi("generate_proposal", async (ai) =>
    generateProposal(ai.provider, ai.brand, {
      clientName: client.company_name, clientIndustry: client.industry ?? undefined, projectTitle: v.title, description: v.description,
      goals: v.goals, requirements: v.requirements, services: v.services, timeline: v.timeline, budget: v.budget, notes: v.notes, currency: v.currency, audience: v.audience,
    }, await ai.knowledge(`${v.title} ${v.description} ${v.goals} ${v.services.join(" ")} ${client.industry ?? ""}`)));
}

export async function generateQuotationDescriptionAction(input: { service: string; context?: string }): Promise<ActionResult<{ description: string }>> {
  const ctx = await actionContext("document:create");
  if (!ctx.ok) return ctx.error;
  const service = String(input.service ?? "").trim().slice(0, 200);
  if (!service) return fail("Enter the service name first.");
  return withAi("quotation_description", async (ai) => ({ description: await generateQuotationDescription(ai.provider, ai.brand, { service, context: input.context?.slice(0, 500) }) }));
}

export async function generateFollowUpAction(documentId: string): Promise<ActionResult<{ subject: string; body: string }>> {
  const ctx = await actionContext("document:create");
  if (!ctx.ok) return ctx.error;
  if (!z.string().uuid().safeParse(documentId).success) return fail("This document no longer exists.");
  const { data: doc } = await ctx.supabase.from("documents").select("title, status, created_at, content_json, clients(contact_name)").eq("id", documentId).eq("workspace_id", ctx.workspaceId).maybeSingle();
  if (!doc) return fail("This document no longer exists.");
  const { count } = await ctx.supabase.from("document_views").select("id", { count: "exact", head: true }).eq("document_id", documentId);
  const c = Array.isArray(doc.clients) ? doc.clients[0] : doc.clients;
  const days = Math.max(0, Math.floor((Date.now() - new Date(doc.created_at).getTime()) / 86_400_000));
  return withAi("follow_up", async (ai) => generateFollowUp(ai.provider, ai.brand, {
    clientContact: c?.contact_name ?? "", documentTitle: doc.title, status: doc.status, daysSinceSent: days, viewed: (count ?? 0) > 0,
  }));
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DOCUMENT_LIMIT_MESSAGE, documentAllowance, monthStartIso } from "@/lib/billing/plans";
import { premiumTemplateError } from "./plan-guard";
import { documentHref } from "@/lib/db/documents";
import { loadLiveBrand } from "@/lib/db/render";
import { DEFAULT_TEMPLATE_KEY, getSystemTemplate } from "@/lib/documents/templates";
import { documentTotals } from "@/lib/documents/totals";
import { LIBRARY, PLATFORMS } from "@/lib/social/library";
import { buildSocialAuditContent } from "@/lib/social/build";
import { actionContext } from "./context";
import { fail, fromZod, GENERIC_ERROR, type ActionResult } from "./result";

const platformKeys = PLATFORMS.map((p) => p.key) as [string, ...string[]];
const schema = z.object({
  clientId: z.string().uuid("Choose a client"),
  accounts: z.array(z.object({ platform: z.enum(platformKeys), handle: z.string().trim().max(200).default(""), url: z.string().trim().max(500).default("") })).max(8),
  sectionKeys: z.array(z.string().max(40)).max(40),
  templateKey: z.string().max(60).default(DEFAULT_TEMPLATE_KEY.social_audit),
});
export type SocialAuditInput = z.input<typeof schema>;

export async function createSocialAuditAction(input: SocialAuditInput): Promise<ActionResult<{ id: string; href: string }>> {
  const ctx = await actionContext("document:create");
  if (!ctx.ok) return ctx.error;
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;

  const { data: sub } = await ctx.supabase.from("subscriptions").select("plan, limits, status, current_period_end").eq("workspace_id", ctx.workspaceId).maybeSingle();
  const { count } = await ctx.supabase.from("documents").select("id", { count: "exact", head: true }).eq("workspace_id", ctx.workspaceId).gte("created_at", monthStartIso());
  if (!documentAllowance(sub, count ?? 0).ok) return fail(DOCUMENT_LIMIT_MESSAGE);
  const denied = await premiumTemplateError(ctx.supabase, ctx.workspaceId, v.templateKey);
  if (denied) return fail(denied);

  const { data: client } = await ctx.supabase.from("clients").select("company_name, contact_name, email, phone, address").eq("id", v.clientId).eq("workspace_id", ctx.workspaceId).maybeSingle();
  if (!client) return fail("Choose one of your clients.");
  const brand = await loadLiveBrand(ctx.supabase, ctx.workspaceId);
  if (!brand) return fail("We couldn't load your company profile. Refresh and try again.");

  const known = new Set(LIBRARY.map((l) => l.key));
  const content = buildSocialAuditContent({
    brand, date: new Date().toISOString().slice(0, 10),
    client: { company: client.company_name, contact: client.contact_name ?? "", email: client.email ?? "", phone: client.phone ?? "", address: client.address ?? "" },
    accounts: v.accounts.map((a) => ({ ...a, platform: a.platform as never })),
    sectionKeys: v.sectionKeys.filter((k) => known.has(k)),
  });

  const tpl = getSystemTemplate(v.templateKey);
  const totals = documentTotals(content);
  const { data, error } = await ctx.supabase.from("documents").insert({
    workspace_id: ctx.workspaceId, client_id: v.clientId, type: "social_audit", title: content.cover.title, status: "draft", content_json: content,
    template_key: tpl?.type === "social_audit" ? tpl.key : DEFAULT_TEMPLATE_KEY.social_audit, total_amount: totals.amount, currency: totals.currency, created_by: ctx.user.id,
  }).select("id").single();
  if (error || !data) return fail(GENERIC_ERROR);
  revalidatePath("/social-audits"); revalidatePath("/dashboard");
  return { ok: true, data: { id: data.id, href: documentHref("social_audit", data.id) } };
}

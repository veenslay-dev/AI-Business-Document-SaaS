"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { analyzeAudit } from "@/lib/ai/functions";
import { withAi } from "@/lib/ai/service";
import { analyze } from "@/lib/audit/analyze";
import { buildAuditContent } from "@/lib/audit/build";
import { collectSite } from "@/lib/audit/collect";
import { AUDITS_PER_HOUR } from "@/lib/audit/limits";
import { parsePublicUrl, UnsafeUrlError } from "@/lib/audit/ssrf";
import { DOCUMENT_LIMIT_MESSAGE, documentAllowance, monthStartIso } from "@/lib/billing/plans";
import { premiumTemplateError } from "./plan-guard";
import { DEFAULT_TEMPLATE_KEY, getSystemTemplate } from "@/lib/documents/templates";
import { documentHref } from "@/lib/db/documents";
import { loadLiveBrand } from "@/lib/db/render";
import { actionContext } from "./context";
import { fail, fromZod, GENERIC_ERROR, type ActionResult } from "./result";

const MAX_AUDITS_PER_HOUR = AUDITS_PER_HOUR;
const schema = z.object({
  clientId: z.string().uuid("Choose a client"),
  url: z.string().trim().min(3, "Enter the website address").max(500),
  useAi: z.boolean().default(false),
  templateKey: z.string().max(60).default(DEFAULT_TEMPLATE_KEY.seo_audit),
});

export async function createAuditAction(input: z.input<typeof schema>): Promise<ActionResult<{ id: string; href: string; notice?: string }>> {
  const ctx = await actionContext("document:create");
  if (!ctx.ok) return ctx.error;
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;

  let url: URL;
  try { url = parsePublicUrl(v.url); } catch (e) { return fail(e instanceof UnsafeUrlError ? e.message : "Enter a valid website address."); }

  const { data: sub } = await ctx.supabase.from("subscriptions").select("plan, limits, status, current_period_end").eq("workspace_id", ctx.workspaceId).maybeSingle();
  const { count: monthDocs } = await ctx.supabase.from("documents").select("id", { count: "exact", head: true }).eq("workspace_id", ctx.workspaceId).gte("created_at", monthStartIso());
  if (!documentAllowance(sub, monthDocs ?? 0).ok) return fail(DOCUMENT_LIMIT_MESSAGE);
  const denied = await premiumTemplateError(ctx.supabase, ctx.workspaceId, v.templateKey);
  if (denied) return fail(denied);

  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await ctx.supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("workspace_id", ctx.workspaceId).eq("operation", "audit_scan").gte("created_at", hourAgo);
  if ((count ?? 0) >= MAX_AUDITS_PER_HOUR) return fail("You've run a lot of audits in the last hour. Try again a little later.");

  const { data: client } = await ctx.supabase.from("clients").select("company_name, contact_name, email, phone, address").eq("id", v.clientId).eq("workspace_id", ctx.workspaceId).maybeSingle();
  if (!client) return fail("Choose one of your clients.");
  const brand = await loadLiveBrand(ctx.supabase, ctx.workspaceId);
  if (!brand) return fail("We couldn't load your company profile. Refresh and try again.");

  await ctx.supabase.from("ai_usage").insert({ workspace_id: ctx.workspaceId, user_id: ctx.user.id, operation: "audit_scan", provider: null });

  let signals;
  try { signals = await collectSite(url.toString()); }
  catch (e) {
    if (e instanceof UnsafeUrlError) return fail(e.message);
    return fail("We couldn't reach that website. Check the address and that the site is online, then try again.");
  }

  let findings = analyze(signals);
  let summary: string | undefined;
  let notice: string | undefined;
  if (v.useAi) {
    const open = findings.filter((f) => f.severity !== "passed").slice(0, 40);
    const res = await withAi("audit_analysis", (ai) => analyzeAudit(ai.provider, ai.brand, {
      url: url.toString(), clientName: client.company_name,
      findings: open.map((f) => ({ id: f.id, category: f.category, issue: f.issue, severity: f.severity, technical: `${f.explanation} Fix: ${f.recommendation}`, affectedUrl: f.affectedUrl })),
    }));
    if (res.ok && res.data) {
      const byId = new Map(res.data.findings.map((f) => [f.id, f]));
      findings = findings.map((f) => { const r = byId.get(f.id); return r && f.severity !== "passed" ? { ...f, explanation: r.explanation, recommendation: r.recommendation } : f; });
      summary = res.data.summary;
    } else if (!res.ok) notice = `The audit was created, but the AI rewrite was skipped: ${res.error}`;
  }

  const info = { company: client.company_name, contact: client.contact_name ?? "", email: client.email ?? "", phone: client.phone ?? "", address: client.address ?? "" };
  const content = buildAuditContent({ brand, client: info, url: url.toString(), findings, summary, scannedAt: signals.scannedAt });
  content.cover.title = `SEO Audit: ${url.hostname.replace(/^www\./, "")}`;

  const tpl = getSystemTemplate(v.templateKey);
  const { data, error } = await ctx.supabase.from("documents").insert({
    workspace_id: ctx.workspaceId, client_id: v.clientId, type: "seo_audit", title: content.cover.title, status: "draft", content_json: content,
    template_key: tpl?.type === "seo_audit" ? tpl.key : DEFAULT_TEMPLATE_KEY.seo_audit, created_by: ctx.user.id,
  }).select("id").single();
  if (error || !data) return fail(GENERIC_ERROR);
  revalidatePath("/seo-audits"); revalidatePath("/dashboard");
  return { ok: true, data: { id: data.id, href: documentHref("seo_audit", data.id), notice } };
}

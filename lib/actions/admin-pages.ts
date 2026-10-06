"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { collectSite } from "@/lib/audit/collect";
import { parsePublicUrl } from "@/lib/audit/ssrf";
import { isPlatformAdmin } from "@/lib/auth/admin";
import { PAGE_BY_PATH } from "@/lib/seo/registry";
import { parseCustomSchema } from "@/lib/seo/schema";
import { siteUrl } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, fromZod, GENERIC_ERROR, type ActionResult } from "./result";

const urlOrPath = (label: string) => z.string().trim().max(500).refine((v) => v === "" || /^\/(?!\/)/.test(v) || /^https:\/\/[^\s]+$/i.test(v), `${label} must start with / or https://`);

const schema = z.object({
  path: z.string().refine((p) => p in PAGE_BY_PATH, "Unknown page"),
  seoTitle: z.string().trim().max(120, "Keep the title under 120 characters").default(""),
  seoDescription: z.string().trim().max(320, "Keep the description under 320 characters").default(""),
  canonical: urlOrPath("The canonical address").default(""),
  ogImage: urlOrPath("The social image").default(""),
  robots: z.enum(["default", "index", "noindex"]).default("default"),
  heading: z.string().trim().max(200, "Keep the heading under 200 characters").default(""),
  intro: z.string().trim().max(1000, "Keep the intro under 1,000 characters").default(""),
  extraMd: z.string().max(20_000, "The extra content is too long").default(""),
  schemaJson: z.string().max(20_000).default(""),
});
export type PageInput = z.input<typeof schema>;

const nul = (v: string) => (v.trim() ? v.trim() : null);

/** Saves the SEO settings and content for one public page. Admin only, checked on the server. */
export async function savePageAction(input: PageInput): Promise<ActionResult> {
  if (!(await isPlatformAdmin())) return fail("Not allowed.");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;
  const def = PAGE_BY_PATH[v.path];
  const custom = parseCustomSchema(v.schemaJson);
  if (custom.error) return fail(custom.error, { schemaJson: custom.error });

  const row = {
    path: v.path, seo_title: nul(v.seoTitle), seo_description: nul(v.seoDescription), canonical: nul(v.canonical), og_image: nul(v.ogImage),
    robots: v.robots === "default" ? null : v.robots,
    // Pages without editable text ignore these fields.
    heading: def.content ? nul(v.heading) : null, intro: def.content ? nul(v.intro) : null, extra_md: def.content ? nul(v.extraMd) : null,
    schema_json: nul(v.schemaJson), updated_at: new Date().toISOString(),
  };
  const { error } = await createAdminClient().from("site_pages").upsert(row, { onConflict: "path" });
  if (error) { console.error("[admin-pages] save failed", error.message); return fail(GENERIC_ERROR); }
  revalidatePath(v.path); revalidatePath("/admin/pages"); revalidatePath("/sitemap.xml");
  return { ok: true, message: "Saved. The page is updated now." };
}

/** Removes every override for a page so it goes back to its built-in text and settings. */
export async function resetPageAction(path: string): Promise<ActionResult> {
  if (!(await isPlatformAdmin())) return fail("Not allowed.");
  if (!(path in PAGE_BY_PATH)) return fail("Unknown page.");
  const { error } = await createAdminClient().from("site_pages").delete().eq("path", path);
  if (error) { console.error("[admin-pages] reset failed", error.message); return fail(GENERIC_ERROR); }
  revalidatePath(path); revalidatePath("/admin/pages"); revalidatePath("/sitemap.xml");
  return { ok: true, message: "Back to the built-in settings." };
}

/**
 * Runs the real SEO audit scan on our own website and saves it as the sample report on the SEO Audit Report Generator page.
 * Admin only. It scans the address in NEXT_PUBLIC_SITE_URL, which must be the real public domain.
 */
export async function refreshSampleAuditAction(): Promise<ActionResult<{ url: string; scannedAt: string }>> {
  if (!(await isPlatformAdmin())) return fail("Not allowed.");
  const url = siteUrl();
  if (!/^https:\/\//.test(url) || /localhost|127\.0\.0\.1|vercel\.app/i.test(url)) return fail("NEXT_PUBLIC_SITE_URL is not your real domain yet (it is " + url + "). Set it to https://www.priodraft.com in Vercel, redeploy, then run the audit.");
  const admin = createAdminClient();
  const { data: last } = await admin.from("sample_audits").select("updated_at").eq("key", "site").maybeSingle();
  if (last?.updated_at && Date.now() - new Date(last.updated_at as string).getTime() < 60_000) return fail("An audit was saved less than a minute ago. Wait a moment and try again.");
  try {
    parsePublicUrl(url);
    const signals = await collectSite(url, { pageSpeed: true });
    const scannedAt = signals.scannedAt;
    const { error } = await admin.from("sample_audits").upsert({ key: "site", url, scanned_at: scannedAt, signals, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) { console.error("[sample-audit] save failed", error.message); return fail(GENERIC_ERROR); }
    revalidatePath("/seo-audit-report-generator"); revalidatePath("/document-templates"); revalidatePath("/admin/pages/edit");
    return { ok: true, data: { url, scannedAt }, message: "Audit saved. The sample report on the page now shows it." };
  } catch (e) {
    console.error("[sample-audit] scan failed", e instanceof Error ? e.message : "unknown");
    return fail("The scan could not finish. Check that the site is reachable from the internet and try again.");
  }
}

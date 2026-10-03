"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isPlatformAdmin } from "@/lib/auth/admin";
import { PAGE_BY_PATH } from "@/lib/seo/registry";
import { parseCustomSchema } from "@/lib/seo/schema";
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

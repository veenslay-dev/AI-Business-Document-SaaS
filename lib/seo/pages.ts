import "server-only";
import { cache } from "react";
import type { Metadata } from "next";
import { PRODUCT_NAME } from "@/components/ui/logo";
import { createAdminClient } from "@/lib/supabase/admin";
import { PAGE_BY_PATH } from "./registry";

export type PageOverride = {
  path: string; seo_title: string | null; seo_description: string | null; og_image: string | null; robots: "index" | "noindex" | null;
  canonical: string | null; heading: string | null; intro: string | null; extra_md: string | null; schema_json: string | null; updated_at: string | null;
};

const COLS = "path, seo_title, seo_description, og_image, robots, canonical, heading, intro, extra_md, schema_json, updated_at";

/** All saved overrides, keyed by path. Falls back to nothing (so the built-in defaults show) if the table or the database is unavailable. */
export const getOverrides = cache(async (): Promise<Record<string, PageOverride>> => {
  try {
    const { data, error } = await createAdminClient().from("site_pages").select(COLS);
    if (error || !data) return {};
    return Object.fromEntries((data as PageOverride[]).map((r) => [r.path, r]));
  } catch { return {}; }
});

export const getOverride = async (path: string): Promise<PageOverride | null> => (await getOverrides())[path] ?? null;

const clean = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

/** What a content-editable page should show: the admin's text if set, otherwise the page's own default. */
export async function getPageContent(path: string) {
  const o = await getOverride(path);
  return { heading: clean(o?.heading), intro: clean(o?.intro), extraMd: clean(o?.extra_md) };
}

/** Whether a page may be indexed, after any admin override. */
export const isIndexable = (path: string, o: PageOverride | null): boolean => (o?.robots ? o.robots === "index" : !PAGE_BY_PATH[path]?.noindex);

/** Metadata for a public page: admin overrides on top of the defaults, a self-referencing canonical, social tags and robots. */
export async function pageMetadata(path: string): Promise<Metadata> {
  const def = PAGE_BY_PATH[path];
  const o = await getOverride(path);
  const title = clean(o?.seo_title) ?? def.title;
  const description = clean(o?.seo_description) ?? def.description;
  const canonical = clean(o?.canonical) ?? path;
  const shownTitle = clean(o?.seo_title) ?? (def.absoluteTitle ? def.title : `${def.title} | ${PRODUCT_NAME}`);
  // Every page gets a share image: the admin's own if set, otherwise a card drawn for this page.
  const image = clean(o?.og_image) ?? `/og?path=${encodeURIComponent(path)}`;
  const alt = `${shownTitle}`;
  return {
    title: clean(o?.seo_title) || def.absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical },
    robots: isIndexable(path, o) ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { title: shownTitle, description, url: canonical, siteName: PRODUCT_NAME, type: "website", locale: "en_IN", images: [{ url: image, width: 1200, height: 630, alt }] },
    twitter: { card: "summary_large_image", title: shownTitle, description, images: [{ url: image, alt }] },
  };
}

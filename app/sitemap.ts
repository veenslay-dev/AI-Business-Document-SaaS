import type { MetadataRoute } from "next";
import { getOverrides, isIndexable } from "@/lib/seo/pages";
import { PAGES } from "@/lib/seo/registry";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PRIORITY: Record<string, number> = { "/": 1, "/pricing": 0.8, "/about": 0.5, "/contact": 0.5 };

/** Lists every public page that may be indexed. A page an admin marks noindex drops out automatically. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const overrides = await getOverrides();
  return PAGES.filter((p) => isIndexable(p.path, overrides[p.path] ?? null)).map((p) => {
    const o = overrides[p.path];
    return {
      url: `${base}${p.path === "/" ? "/" : p.path}`,
      changeFrequency: p.path === "/" ? "weekly" : "monthly",
      priority: PRIORITY[p.path] ?? 0.3,
      ...(o?.updated_at ? { lastModified: new Date(o.updated_at) } : {}),
    };
  });
}

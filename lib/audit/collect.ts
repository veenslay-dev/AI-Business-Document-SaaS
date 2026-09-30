import "server-only";
import * as cheerio from "cheerio";
import { safeFetch, type FetchOptions, type FetchResult } from "./fetcher";
import type { PageSignals, SiteSignals } from "./types";

const MAX_EXTRA_PAGES = 5;
const MAX_LINK_CHECKS = 10;

export function parsePage(url: string, r: FetchResult): PageSignals {
  const $ = cheerio.load(r.body);
  const text = (sel: string) => $(sel).first().text().replace(/\s+/g, " ").trim();
  const origin = new URL(r.finalUrl).origin;

  const internal = new Set<string>();
  let external = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) return;
    try {
      const u = new URL(href, r.finalUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") return;
      u.hash = "";
      if (u.origin === origin) internal.add(u.toString()); else external += 1;
    } catch { /* ignore malformed links */ }
  });

  let jsonLdErrors = 0;
  const types = new Set<string>();
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).contents().text());
      const walk = (n: unknown) => {
        if (Array.isArray(n)) return n.forEach(walk);
        if (n && typeof n === "object") {
          const t = (n as Record<string, unknown>)["@type"];
          (Array.isArray(t) ? t : t ? [t] : []).forEach((x) => types.add(String(x)));
          Object.values(n as object).forEach(walk);
        }
      };
      walk(data);
    } catch { jsonLdErrors += 1; }
  });

  const imgs = $("img");
  let missing = 0;
  imgs.each((_, el) => { const alt = $(el).attr("alt"); if (alt === undefined || alt.trim() === "") missing += 1; });

  $("script,style,noscript,template").remove();
  const words = $("body").text().replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;
  const links = [...internal];

  return {
    url, status: r.status, finalUrl: r.finalUrl, redirects: r.redirects.length, contentType: r.headers["content-type"] ?? "", bytes: r.bytes, ms: r.ms,
    title: text("title"), metaDescription: ($('meta[name="description" i]').attr("content") ?? "").trim(), canonical: ($('link[rel="canonical"]').attr("href") ?? "").trim(),
    robotsMeta: ($('meta[name="robots" i]').attr("content") ?? "").toLowerCase(), xRobots: (r.headers["x-robots-tag"] ?? "").toLowerCase(),
    h1: $("h1").map((_, e) => $(e).text().replace(/\s+/g, " ").trim()).get().filter(Boolean),
    h2: $("h2").map((_, e) => $(e).text().replace(/\s+/g, " ").trim()).get().filter(Boolean),
    imgTotal: imgs.length, imgMissingAlt: missing, wordCount: words, hasViewport: $('meta[name="viewport"]').length > 0, lang: ($("html").attr("lang") ?? "").trim(),
    jsonLdTypes: [...types], jsonLdErrors, internalLinks: links, externalLinkCount: external,
    isHttps: new URL(r.finalUrl).protocol === "https:", hsts: !!r.headers["strict-transport-security"],
    blogLink: links.some((l) => /\/(blog|news|articles?|resources|guides?|insights)(\/|$)/i.test(new URL(l).pathname)),
  };
}

async function pool<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); }
  }));
  return out;
}

async function pageSpeed(url: string): Promise<SiteSignals["psi"]> {
  try {
    const key = process.env.PAGESPEED_API_KEY;
    const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance${key ? `&key=${key}` : ""}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 45_000);
    const res = await fetch(api, { signal: ctrl.signal }).finally(() => clearTimeout(t));
    if (!res.ok) return null;
    const j = (await res.json()) as { lighthouseResult?: { categories?: { performance?: { score?: number } }; audits?: Record<string, { numericValue?: number }> } };
    const score = j.lighthouseResult?.categories?.performance?.score;
    if (typeof score !== "number") return null;
    const a = j.lighthouseResult?.audits ?? {};
    return { score: Math.round(score * 100), lcp: a["largest-contentful-paint"]?.numericValue ?? null, cls: a["cumulative-layout-shift"]?.numericValue ?? null, tbt: a["total-blocking-time"]?.numericValue ?? null };
  } catch { return null; }
}

/**
 * Collects raw SEO signals from a site: the home page, a few internal pages,
 * robots.txt, the sitemap, a sample of internal links and (optionally) PageSpeed data.
 * Every request goes through safeFetch, which refuses private and internal addresses.
 */
export async function collectSite(startUrl: string, opts: Pick<FetchOptions, "allowPrivate"> & { pageSpeed?: boolean } = {}): Promise<SiteSignals> {
  const f = (u: string, o: FetchOptions = {}) => safeFetch(u, { allowPrivate: opts.allowPrivate, ...o });
  const homeRes = await f(startUrl, { timeoutMs: 15_000 });
  if (homeRes.status === 0) throw new Error("no response");
  const home = parsePage(startUrl, homeRes);
  const origin = new URL(homeRes.finalUrl).origin;

  const [robotsRes, psi, httpRes] = await Promise.all([
    f(`${origin}/robots.txt`, { timeoutMs: 8000, maxBytes: 200_000 }).catch(() => null),
    opts.pageSpeed === false ? Promise.resolve(null) : pageSpeed(homeRes.finalUrl),
    origin.startsWith("https://") && !opts.allowPrivate ? f(`http://${new URL(origin).host}/`, { timeoutMs: 8000, method: "HEAD" }).catch(() => null) : Promise.resolve(null),
  ]);

  const robotsBody = robotsRes?.status === 200 ? robotsRes.body : "";
  const sitemapUrls = [...robotsBody.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]);
  let sitemap = { found: false, urlCount: 0 };
  for (const su of [...sitemapUrls.slice(0, 2), `${origin}/sitemap.xml`]) {
    const r = await f(su, { timeoutMs: 8000, maxBytes: 1_000_000 }).catch(() => null);
    if (r?.status === 200 && /<(urlset|sitemapindex)/i.test(r.body)) { sitemap = { found: true, urlCount: (r.body.match(/<loc>/gi) ?? []).length }; break; }
  }
  const groups = robotsBody.split(/^\s*user-agent:/gim).slice(1);
  const blocksAll = groups.some((g) => /^\s*\*/.test(g) && /^\s*disallow:\s*\/\s*$/im.test(g));

  // Extra pages to compare titles and content: prefer short paths that look like real pages.
  const candidates = home.internalLinks.filter((l) => l !== homeRes.finalUrl && !/\.(pdf|jpe?g|png|gif|webp|svg|zip|css|js)(\?|$)/i.test(l))
    .sort((a, b) => new URL(a).pathname.length - new URL(b).pathname.length);
  const extras = await pool(candidates.slice(0, MAX_EXTRA_PAGES), 3, async (u) => {
    try { const r = await f(u, { timeoutMs: 10_000 }); return /html/i.test(r.headers["content-type"] ?? "") ? parsePage(u, r) : null; } catch { return null; }
  });

  const toCheck = candidates.slice(0, MAX_LINK_CHECKS);
  const checked = await pool(toCheck, 4, async (u) => {
    try { let r = await f(u, { method: "HEAD", timeoutMs: 8000 }); if (r.status === 405 || r.status === 501) r = await f(u, { timeoutMs: 8000 }); return { url: u, status: r.status }; }
    catch { return { url: u, status: 0 }; }
  });

  return {
    origin, scannedAt: new Date().toISOString(), home, pages: extras.filter((p): p is PageSignals => !!p),
    robots: { status: robotsRes?.status ?? 0, blocksAll, sitemapUrls }, sitemap,
    brokenLinks: checked.filter((c) => c.status === 0 || c.status >= 400), httpToHttps: httpRes ? httpRes.finalUrl.startsWith("https://") : null, psi,
  };
}

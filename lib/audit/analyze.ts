import type { AuditFinding, Category, PageSignals, Severity, SiteSignals } from "./types";
import { CATEGORIES } from "./types";

const WEIGHT: Record<Exclude<Severity, "passed">, number> = { critical: 10, high: 6, medium: 3, low: 1.5 };

type Check = {
  id: string; category: Category; issue: string; pass: string;
  fail?: { severity: Exclude<Severity, "passed">; explanation: string; recommendation: string; affectedUrl?: string } | null;
  /** Severity this check carries if it fails; used for the score even when it passes. */
  potential: Exclude<Severity, "passed">;
};

const finding = (c: Check): AuditFinding => ({
  id: c.id, category: c.category, issue: c.issue, weight: WEIGHT[c.fail?.severity ?? c.potential],
  severity: c.fail ? c.fail.severity : "passed", explanation: c.fail ? c.fail.explanation : c.pass,
  recommendation: c.fail ? c.fail.recommendation : "", affectedUrl: c.fail?.affectedUrl ?? "", status: c.fail ? "open" : "passed",
});

const path = (u: string) => { try { const x = new URL(u); return x.pathname + x.search || "/"; } catch { return u; } };
const list = (urls: string[], max = 6) => urls.slice(0, max).map(path).join(", ") + (urls.length > max ? ` and ${urls.length - max} more` : "");
const dupes = (vals: { url: string; v: string }[]) => {
  const m = new Map<string, string[]>();
  vals.filter((x) => x.v).forEach((x) => m.set(x.v.toLowerCase(), [...(m.get(x.v.toLowerCase()) ?? []), x.url]));
  return [...m.values()].filter((u) => u.length > 1).flat();
};

/** Turns raw signals into audit findings. Pure and deterministic, so it can be tested without a network. */
export function analyze(s: SiteSignals): AuditFinding[] {
  const h = s.home;
  const all: PageSignals[] = [h, ...s.pages];
  const checks: Check[] = [];
  const add = (c: Check) => checks.push(c);

  // ---- Technical SEO
  add({ id: "https", category: "Technical SEO", issue: "HTTPS", potential: "critical",
    pass: "The site is served over HTTPS, which browsers and search engines expect.",
    fail: !h.isHttps ? { severity: "critical", explanation: "The site loads over an unsecured connection. Browsers warn visitors, and Google treats HTTPS as a ranking signal.", recommendation: "Install an SSL certificate and redirect all http:// addresses to https://.", affectedUrl: h.finalUrl }
      : s.httpToHttps === false ? { severity: "high", explanation: "Visitors who type the http:// address are not sent to the secure version, so both versions can be indexed and some visitors see a warning.", recommendation: "Add a site-wide 301 redirect from http:// to https://.", affectedUrl: s.origin.replace("https://", "http://") } : null });

  add({ id: "status", category: "Technical SEO", issue: "Status code", potential: "critical",
    pass: `The home page responds normally (HTTP ${h.status}).`,
    fail: h.status >= 400 ? { severity: "critical", explanation: `The home page returns HTTP ${h.status}, so search engines and visitors cannot use it.`, recommendation: "Fix the server or routing problem so the home page returns 200.", affectedUrl: h.finalUrl } : null });

  const noindex = /noindex/.test(h.robotsMeta) || /noindex/.test(h.xRobots);
  add({ id: "indexability", category: "Technical SEO", issue: "Indexability", potential: "critical",
    pass: "Nothing on the home page tells search engines to stay away.",
    fail: noindex ? { severity: "critical", explanation: "The home page carries a noindex instruction, so Google will drop it from search results.", recommendation: "Remove the noindex directive from the meta robots tag or X-Robots-Tag header, unless the page is meant to be private.", affectedUrl: h.finalUrl }
      : s.robots.blocksAll ? { severity: "critical", explanation: "robots.txt blocks every crawler from the whole site, so nothing can be crawled.", recommendation: "Remove the 'Disallow: /' rule for all user agents in robots.txt.", affectedUrl: `${s.origin}/robots.txt` } : null });

  add({ id: "robots", category: "Technical SEO", issue: "Robots.txt", potential: "medium",
    pass: "A robots.txt file is present.",
    fail: s.robots.status !== 200 ? { severity: "medium", explanation: "There is no robots.txt file. Search engines can still crawl, but you can't point them to your sitemap or keep low value pages out.", recommendation: "Add a robots.txt at the site root that references your XML sitemap.", affectedUrl: `${s.origin}/robots.txt` } : null });

  add({ id: "sitemap", category: "Technical SEO", issue: "XML sitemap", potential: "high",
    pass: `An XML sitemap was found with ${s.sitemap.urlCount} URLs.`,
    fail: !s.sitemap.found ? { severity: "high", explanation: "No XML sitemap was found. Search engines rely on it to discover new and updated pages quickly.", recommendation: "Generate an XML sitemap, submit it in Google Search Console and reference it from robots.txt.", affectedUrl: `${s.origin}/sitemap.xml` } : null });

  const canonicalOk = !h.canonical || (() => { try { return new URL(h.canonical, h.finalUrl).origin === new URL(h.finalUrl).origin; } catch { return false; } })();
  add({ id: "canonical", category: "Technical SEO", issue: "Canonical tag", potential: "medium",
    pass: "The home page declares a canonical address.",
    fail: !h.canonical ? { severity: "low", explanation: "The home page has no canonical tag, which makes it easier for duplicate versions of the page to compete with each other.", recommendation: "Add a self-referencing <link rel=\"canonical\"> to every page.", affectedUrl: h.finalUrl }
      : !canonicalOk ? { severity: "high", explanation: `The canonical tag points to a different site (${h.canonical}), which tells Google to rank that address instead.`, recommendation: "Point the canonical tag at the page's own address.", affectedUrl: h.finalUrl } : null });

  add({ id: "broken-links", category: "Technical SEO", issue: "Broken links", potential: "high",
    pass: "No broken internal links were found in the sample checked.",
    fail: s.brokenLinks.length ? { severity: s.brokenLinks.length >= 3 ? "high" : "medium", explanation: `${s.brokenLinks.length} internal link${s.brokenLinks.length > 1 ? "s" : ""} lead to error pages. Visitors hit dead ends and search engines waste crawl budget.`, recommendation: "Update or remove the broken links, or redirect the old addresses to the right pages.", affectedUrl: list(s.brokenLinks.map((b) => b.url)) } : null });

  add({ id: "redirects", category: "Technical SEO", issue: "Redirects", potential: "medium",
    pass: "The home page loads without a chain of redirects.",
    fail: h.redirects > 1 ? { severity: "medium", explanation: `Reaching the home page takes ${h.redirects} redirects in a row. Each hop slows the page and dilutes link value.`, recommendation: "Redirect straight to the final address in a single step.", affectedUrl: h.url } : null });

  // ---- On-page SEO
  const tl = h.title.length;
  add({ id: "title", category: "On-page SEO", issue: "Title tag", potential: "high",
    pass: `The title is ${tl} characters, within the recommended range.`,
    fail: !h.title ? { severity: "high", explanation: "The home page has no title tag. It is the headline shown in search results and one of the strongest on-page signals.", recommendation: "Write a unique title of about 30 to 60 characters that includes your main service and location.", affectedUrl: h.finalUrl }
      : tl < 25 ? { severity: "medium", explanation: `The title is only ${tl} characters, which wastes space in search results.`, recommendation: "Expand it to 30 to 60 characters with your main keyword and brand.", affectedUrl: h.finalUrl }
      : tl > 65 ? { severity: "low", explanation: `The title is ${tl} characters and is likely to be cut off in search results.`, recommendation: "Shorten it to about 60 characters and put the important words first.", affectedUrl: h.finalUrl } : null });

  const dl = h.metaDescription.length;
  add({ id: "meta-description", category: "On-page SEO", issue: "Meta description", potential: "medium",
    pass: `The meta description is ${dl} characters.`,
    fail: !h.metaDescription ? { severity: "medium", explanation: "There is no meta description, so Google picks text from the page itself, which is often a poor advert for the site.", recommendation: "Write a 70 to 160 character description that says what the page offers and invites a click.", affectedUrl: h.finalUrl }
      : dl > 170 ? { severity: "low", explanation: `The description is ${dl} characters and will be truncated.`, recommendation: "Trim it to about 155 characters.", affectedUrl: h.finalUrl } : null });

  add({ id: "h1", category: "On-page SEO", issue: "H1 heading", potential: "high",
    pass: "The home page has a single H1 heading.",
    fail: h.h1.length === 0 ? { severity: "high", explanation: "The home page has no H1. The main heading tells visitors and search engines what the page is about.", recommendation: "Add one clear H1 that describes the page's main topic.", affectedUrl: h.finalUrl }
      : h.h1.length > 1 ? { severity: "medium", explanation: `The home page has ${h.h1.length} H1 headings, which blurs its main topic.`, recommendation: "Keep one H1 and turn the others into H2s.", affectedUrl: h.finalUrl } : null });

  add({ id: "h2", category: "On-page SEO", issue: "Subheadings (H2)", potential: "low",
    pass: `The page uses ${h.h2.length} H2 subheadings to structure its content.`,
    fail: h.h2.length === 0 ? { severity: "low", explanation: "The home page has no H2 subheadings, so the content is one undivided block.", recommendation: "Break the content into sections with descriptive H2 headings.", affectedUrl: h.finalUrl } : null });

  const missPct = h.imgTotal ? h.imgMissingAlt / h.imgTotal : 0;
  add({ id: "alt", category: "On-page SEO", issue: "Image alt text", potential: "medium",
    pass: h.imgTotal ? "All images have alt text." : "The home page has no images to check.",
    fail: h.imgMissingAlt > 0 ? { severity: missPct > 0.3 ? "medium" : "low", explanation: `${h.imgMissingAlt} of ${h.imgTotal} images have no alt text. Screen readers can't describe them and Google can't understand them.`, recommendation: "Add short, descriptive alt text to every meaningful image.", affectedUrl: h.finalUrl } : null });

  add({ id: "viewport", category: "On-page SEO", issue: "Mobile viewport", potential: "high",
    pass: "The page declares a mobile viewport.",
    fail: !h.hasViewport ? { severity: "high", explanation: "There's no viewport meta tag, so phones show a shrunken desktop page. Google indexes the mobile version first.", recommendation: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> and check the layout on a phone.", affectedUrl: h.finalUrl } : null });

  // ---- Performance
  add({ id: "server-response", category: "Performance", issue: "Server response time", potential: "medium",
    pass: `The home page responded in ${h.ms} ms.`,
    fail: h.ms > 3000 ? { severity: "high", explanation: `The home page took ${(h.ms / 1000).toFixed(1)} seconds to respond. Slow servers hurt rankings and lose visitors.`, recommendation: "Add caching, upgrade hosting or use a CDN, and check for slow database queries.", affectedUrl: h.finalUrl }
      : h.ms > 1500 ? { severity: "medium", explanation: `The home page took ${(h.ms / 1000).toFixed(1)} seconds to respond, slower than the 0.8 second target.`, recommendation: "Add page caching or a CDN in front of the site.", affectedUrl: h.finalUrl } : null });

  add({ id: "page-weight", category: "Performance", issue: "HTML size", potential: "low",
    pass: `The HTML document is ${(h.bytes / 1024).toFixed(0)} KB.`,
    fail: h.bytes > 1_000_000 ? { severity: "medium", explanation: `The HTML alone is ${(h.bytes / 1_048_576).toFixed(1)} MB, which is heavy before any images load.`, recommendation: "Remove inline data and unused markup, and enable compression.", affectedUrl: h.finalUrl } : null });

  if (s.psi) {
    const p = s.psi;
    add({ id: "page-speed", category: "Performance", issue: "Page speed (mobile)", potential: "high",
      pass: `Lighthouse gives the page ${p.score} out of 100 on mobile.`,
      fail: p.score < 50 ? { severity: "high", explanation: `Lighthouse scores the home page ${p.score}/100 on mobile, which is poor. Slow pages lose visitors and rankings.`, recommendation: "Compress and lazy-load images, remove unused scripts and defer non-critical JavaScript.", affectedUrl: h.finalUrl }
        : p.score < 90 ? { severity: "medium", explanation: `Lighthouse scores the home page ${p.score}/100 on mobile. There's room to get into the green.`, recommendation: "Work through the Lighthouse opportunities: image sizes, render-blocking scripts and caching.", affectedUrl: h.finalUrl } : null });
    const lcp = p.lcp, cls = p.cls, tbt = p.tbt;
    add({ id: "cwv", category: "Performance", issue: "Core Web Vitals", potential: "high",
      pass: "Loading, layout stability and responsiveness measures are within Google's targets.",
      fail: (lcp !== null && lcp > 4000) || (cls !== null && cls > 0.25) || (tbt !== null && tbt > 600)
        ? { severity: "high", explanation: `One or more Core Web Vitals are poor (${[lcp !== null ? `largest paint ${(lcp / 1000).toFixed(1)}s` : "", cls !== null ? `layout shift ${cls.toFixed(2)}` : "", tbt !== null ? `blocking time ${Math.round(tbt)}ms` : ""].filter(Boolean).join(", ")}). Google uses these in ranking.`, recommendation: "Optimise the largest image or text block, reserve space for images and ads, and cut long-running scripts.", affectedUrl: h.finalUrl }
        : (lcp !== null && lcp > 2500) || (cls !== null && cls > 0.1) || (tbt !== null && tbt > 200)
          ? { severity: "medium", explanation: "Some Core Web Vitals are close to, but outside, Google's good range.", recommendation: "Tune image loading and reduce script work to move all three into the green.", affectedUrl: h.finalUrl } : null });
  }

  // ---- Structured data
  add({ id: "schema", category: "Structured data", issue: "Schema markup detected", potential: "medium",
    pass: `Structured data found: ${h.jsonLdTypes.slice(0, 5).join(", ")}.`,
    fail: h.jsonLdTypes.length === 0 && h.jsonLdErrors === 0 ? { severity: "medium", explanation: "No schema markup was found. It helps Google show rich results such as ratings, business details and FAQs.", recommendation: "Add JSON-LD for your organisation or local business, and for products or FAQs where they apply.", affectedUrl: h.finalUrl } : null });
  add({ id: "schema-errors", category: "Structured data", issue: "Schema errors", potential: "high",
    pass: "No broken structured data was found.",
    fail: h.jsonLdErrors > 0 ? { severity: "high", explanation: `${h.jsonLdErrors} structured data block${h.jsonLdErrors > 1 ? "s" : ""} could not be read because the JSON is invalid, so Google will ignore them.`, recommendation: "Fix the JSON syntax and validate the markup with Google's Rich Results Test.", affectedUrl: h.finalUrl } : null });

  // ---- Content
  const thin = all.filter((p) => p.wordCount < 300);
  add({ id: "thin", category: "Content", issue: "Thin content", potential: "medium",
    pass: "The pages checked have enough copy to be useful.",
    fail: thin.length ? { severity: thin.includes(h) ? "medium" : "low", explanation: `${thin.length} of the ${all.length} pages checked have under 300 words. Very short pages rarely rank for competitive searches.`, recommendation: "Expand key pages with useful detail: services, pricing guidance, FAQs and proof.", affectedUrl: list(thin.map((p) => p.finalUrl)) } : null });

  const dupTitles = dupes(all.map((p) => ({ url: p.finalUrl, v: p.title })));
  const dupDesc = dupes(all.map((p) => ({ url: p.finalUrl, v: p.metaDescription })));
  add({ id: "duplicates", category: "Content", issue: "Duplicate titles and descriptions", potential: "medium",
    pass: all.length > 1 ? "The pages checked have distinct titles and descriptions." : "Only one page was checked, so duplicates couldn't be compared.",
    fail: dupTitles.length || dupDesc.length ? { severity: "medium", explanation: "Several pages share the same title or description, so they compete against each other and look interchangeable in results.", recommendation: "Give every page a unique title and description that reflects its own content.", affectedUrl: list([...new Set([...dupTitles, ...dupDesc])]) } : null });

  add({ id: "opportunities", category: "Content", issue: "Content opportunities", potential: "low",
    pass: "The site links to a blog or resources section.",
    fail: !h.blogLink ? { severity: "low", explanation: "There's no visible blog, guides or resources section. Regular helpful content is how sites win the questions customers search for.", recommendation: "Plan content around the questions customers ask before buying, such as costs, comparisons and how-tos.", affectedUrl: s.origin } : null });

  return checks.map(finding);
}

/** Category score: share of the possible weight that wasn't lost to failed checks. */
export function scoreCategories(findings: AuditFinding[]): { category: Category; score: number }[] {
  return CATEGORIES.flatMap((category) => {
    const items = findings.filter((f) => f.category === category);
    if (items.length === 0) return [];
    const total = items.reduce((a, f) => a + f.weight, 0);
    const lost = items.filter((f) => f.severity !== "passed").reduce((a, f) => a + f.weight, 0);
    return [{ category, score: Math.max(0, Math.round(100 * (1 - lost / total))) }];
  });
}

export function overallScore(scores: { score: number }[]): number {
  return scores.length ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length) : 0;
}

/**
 * Everything a signed-in user generates or sees must stay out of search results: documents, PDFs, share links,
 * invite links, exports and the pages of the app itself. This is the one place that decides how, so the
 * response headers, the page metadata and robots.txt all agree.
 */
export const NOINDEX_HEADER = "noindex, nofollow, noarchive, nosnippet, noimageindex";

/** For a page's metadata export. */
export const NOINDEX_META = { index: false, follow: false, noarchive: true, nosnippet: true, noimageindex: true, nocache: true } as const;

/** Path prefixes that are never indexable. Each also matches everything beneath it. */
export const PRIVATE_PREFIXES = [
  "/view", "/invite", "/api", "/auth", "/onboarding",
  "/dashboard", "/clients", "/projects", "/proposals", "/quotations", "/invoices", "/seo-audits", "/social-audits",
  "/templates", "/brand-kit", "/team", "/settings", "/search", "/admin",
] as const;

/**
 * Paths that robots.txt blocks. Generated links (/view, /invite, /api) are deliberately left out: a crawler that is
 * blocked cannot read the noindex header, and a blocked URL can still be listed if someone links to it. Letting
 * it fetch the page is what makes noindex work.
 */
export const ROBOTS_DISALLOW = PRIVATE_PREFIXES.filter((p) => !["/view", "/invite", "/api"].includes(p)).map((p) => `${p}`);

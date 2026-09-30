export type PageSignals = {
  url: string; status: number; finalUrl: string; redirects: number; contentType: string; bytes: number; ms: number;
  title: string; metaDescription: string; canonical: string; robotsMeta: string; xRobots: string;
  h1: string[]; h2: string[]; imgTotal: number; imgMissingAlt: number; wordCount: number; hasViewport: boolean; lang: string;
  jsonLdTypes: string[]; jsonLdErrors: number; internalLinks: string[]; externalLinkCount: number; isHttps: boolean; hsts: boolean;
  blogLink: boolean;
};

export type SiteSignals = {
  origin: string; scannedAt: string; home: PageSignals; pages: PageSignals[];
  robots: { status: number; blocksAll: boolean; sitemapUrls: string[] };
  sitemap: { found: boolean; urlCount: number };
  brokenLinks: { url: string; status: number }[];
  httpToHttps: boolean | null;
  psi: { score: number; lcp: number | null; cls: number | null; tbt: number | null } | null;
};

export type Severity = "critical" | "high" | "medium" | "low" | "passed";
export const CATEGORIES = ["Technical SEO", "On-page SEO", "Performance", "Structured data", "Content"] as const;
export type Category = (typeof CATEGORIES)[number];

export type AuditFinding = {
  id: string; category: Category; issue: string; severity: Severity; explanation: string; recommendation: string;
  affectedUrl: string; status: "open" | "passed"; /** severity this check would have if it failed; drives the score */ weight: number;
};

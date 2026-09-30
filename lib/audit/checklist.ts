import { newId, type Block } from "@/lib/documents/content";
import type { AuditFinding } from "./types";

type Row = { item: string; from: string[]; hint: string };

/**
 * The 15-point SEO audit checklist. Rows with `from` are filled in from the automatic scan;
 * the rest need tools or judgement (analytics, rank trackers, backlink tools), so the auditor completes them.
 */
const ROWS: Row[] = [
  { item: "Mobile friendliness", from: ["viewport"], hint: "Test key pages on a phone and in Google's Mobile-Friendly checks." },
  { item: "All site versions redirect to one (http, https, www, non-www)", from: ["versions", "https"], hint: "" },
  { item: "Page speed and Core Web Vitals", from: ["page-speed", "cwv", "server-response"], hint: "Run PageSpeed Insights on the home page and two key landing pages." },
  { item: "Broken links and 404 handling", from: ["broken-links", "404-page"], hint: "" },
  { item: "On-page SEO: titles, descriptions and headings", from: ["title", "meta-description", "h1", "heading-order"], hint: "" },
  { item: "Zombie pages (thin, outdated or unused pages)", from: ["thin"], hint: "List pages with no traffic in 12 months and decide: improve, merge or remove." },
  { item: "Organic traffic trend", from: [], hint: "Compare 12 months of Google Analytics or Search Console clicks." },
  { item: "Keyword rankings", from: [], hint: "Check current rankings for the target keywords and note big movers." },
  { item: "Backlink profile", from: [], hint: "Review quality, anchor text and any toxic links in a backlink tool." },
  { item: "Competitor analysis", from: [], hint: "Compare 3 competitors on content, backlinks and rankings." },
  { item: "Content improvement opportunities", from: ["opportunities", "duplicates"], hint: "" },
  { item: "User experience and search intent match", from: [], hint: "Does each key page answer what the searcher wanted? Check layout, calls to action and forms." },
  { item: "Site architecture and internal linking", from: ["url-structure"], hint: "Key pages should be reachable within three clicks with descriptive anchor text." },
  { item: "Structured data and featured snippet chances", from: ["schema", "schema-errors"], hint: "" },
  { item: "Indexing and Google Search Console", from: ["indexability", "robots", "sitemap", "search-console", "analytics"], hint: "" },
];

/** Builds the checklist block, with statuses and notes filled from the scan wherever the scan has an answer. */
export function seoChecklistBlock(findings: AuditFinding[]): Extract<Block, { type: "checklist" }> {
  const byId = new Map(findings.map((f) => [f.id, f]));
  return {
    id: newId(), type: "checklist", summary: "Items marked from the automatic scan are pre-filled. Complete the rest using your analytics, rank tracking and backlink tools.",
    items: ROWS.map((r) => {
      const found = r.from.map((id) => byId.get(id)).filter((f): f is AuditFinding => !!f);
      const open = found.filter((f) => f.severity !== "passed");
      const status = found.length === 0 ? ("unchecked" as const)
        : open.some((f) => f.severity === "critical" || f.severity === "high") ? ("poor" as const)
        : open.length ? ("needs_work" as const) : ("good" as const);
      return {
        id: newId(), item: r.item, status, priority: (status === "poor" ? "high" : status === "needs_work" ? "medium" : "") as "" | "high" | "medium",
        note: found.length ? (open.length ? open.map((f) => f.issue).join(", ") : "Checked automatically, no issues found.") : r.hint,
        recommendation: open[0]?.recommendation ?? "",
      };
    }),
  };
}

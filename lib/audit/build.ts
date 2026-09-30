import type { BrandContext } from "@/lib/documents/branding";
import { newId, type DocumentContent, type Section } from "@/lib/documents/content";
import type { ClientInfo } from "@/lib/documents/builders";
import { overallScore, scoreCategories } from "./analyze";
import { CATEGORIES, type AuditFinding } from "./types";

/** Builds the audit report document from findings. Same JSON shape as every other document. */
export function buildAuditContent(args: {
  brand: BrandContext; client: ClientInfo; url: string; findings: AuditFinding[]; summary?: string; scannedAt: string;
}): DocumentContent {
  const { brand, findings } = args;
  const scores = scoreCategories(findings);
  const overall = overallScore(scores);
  const open = findings.filter((f) => f.severity !== "passed");
  const counts = (["critical", "high", "medium", "low"] as const).map((s) => ({ s, n: open.filter((f) => f.severity === s).length })).filter((c) => c.n);

  const intro = args.summary || `We reviewed ${args.url} for technical, on-page, performance, structured data and content issues. ${open.length === 0 ? "No problems were found." : `We found ${open.length} thing${open.length === 1 ? "" : "s"} to fix${counts.length ? ` (${counts.map((c) => `${c.n} ${c.s}`).join(", ")})` : ""}.`}`;

  const sections: Section[] = [
    { id: newId("s"), title: "SEO health summary", hideTitle: false, pageBreakBefore: false, blocks: [{ id: newId(), type: "audit_summary", scores: scores.map((s) => ({ category: s.category, score: s.score })), overall, intro }] },
    ...CATEGORIES.flatMap((category): Section[] => {
      const items = findings.filter((f) => f.category === category);
      if (!items.length) return [];
      return [{
        id: newId("s"), title: category, hideTitle: false, pageBreakBefore: false,
        blocks: [{
          id: newId(), type: "audit_findings", category,
          findings: items.map((f) => ({ id: f.id, issue: f.issue, severity: f.severity, explanation: f.explanation, recommendation: f.recommendation, affectedUrl: f.affectedUrl, status: f.status })),
        }],
      }];
    }),
    { id: newId("s"), title: "Next steps", hideTitle: false, pageBreakBefore: false, blocks: [
      { id: newId(), type: "paragraph", content: "Start with the critical and high priority items, since they hold back everything else. We're happy to walk through the report and fix these for you." },
      { id: newId(), type: "paragraph", content: [brand.company.signatory.name, brand.company.email, brand.company.phone].filter(Boolean).join("  ·  ") },
    ] },
  ];

  return {
    version: 1,
    cover: { kicker: "SEO Audit", title: "SEO Audit", subtitle: args.url, preparedFor: args.client.company, preparedBy: brand.company.name, date: args.scannedAt.slice(0, 10), reference: "" },
    client: args.client, sections, audit: { url: args.url, scannedAt: args.scannedAt },
  };
}

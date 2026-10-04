import type { Severity } from "@/lib/audit/types";
import type { DocumentContent } from "./content";

export type AuditStats = {
  bySeverity: Record<Severity, number>;
  total: number;
  /** One row per audit category (a findings block), with how many issues and passed checks it holds. */
  categories: { category: string; issues: number; passed: number; worst: Severity | null }[];
};

const ORDER: Severity[] = ["critical", "high", "medium", "low", "passed"];

/** Counts findings across every findings block. Always derived from the current content. */
export function computeAuditStats(content: DocumentContent): AuditStats {
  const bySeverity: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, passed: 0 };
  const categories: AuditStats["categories"] = [];
  for (const s of content.sections) {
    for (const b of s.blocks) {
      if (b.type !== "audit_findings" || b.findings.length === 0) continue;
      let issues = 0, passed = 0, worst: Severity | null = null;
      for (const f of b.findings) {
        bySeverity[f.severity]++;
        if (f.severity === "passed") passed++;
        else { issues++; if (worst === null || ORDER.indexOf(f.severity) < ORDER.indexOf(worst)) worst = f.severity; }
      }
      categories.push({ category: b.category || s.title, issues, passed, worst });
    }
  }
  return { bySeverity, total: Object.values(bySeverity).reduce((a, n) => a + n, 0), categories };
}

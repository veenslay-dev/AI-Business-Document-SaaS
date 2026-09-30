import type { DocumentContent } from "@/lib/documents/content";

export type ChecklistStatus = "unchecked" | "good" | "needs_work" | "poor" | "na";
export type ChecklistItem = { id: string; item: string; status: ChecklistStatus; priority: "" | "high" | "medium" | "low"; note: string; recommendation: string };

export const STATUS_LABEL: Record<ChecklistStatus, string> = { unchecked: "Not checked", good: "Good", needs_work: "Needs work", poor: "Poor", na: "N/A" };
const POINTS: Record<ChecklistStatus, number | null> = { good: 1, needs_work: 0.5, poor: 0, unchecked: null, na: null };

/** Score for one checklist: good counts fully, needs work half, poor nothing. Unchecked and N/A items are left out. */
export function checklistScore(items: ChecklistItem[]): { score: number | null; scored: number; checked: number; total: number } {
  const scoredItems = items.filter((i) => POINTS[i.status] !== null);
  const total = items.filter((i) => i.status !== "na").length;
  if (scoredItems.length === 0) return { score: null, scored: 0, checked: 0, total };
  const sum = scoredItems.reduce((a, i) => a + (POINTS[i.status] ?? 0), 0);
  return { score: Math.round((100 * sum) / scoredItems.length), scored: scoredItems.length, checked: scoredItems.length, total };
}

export type SectionScore = { title: string; score: number | null; checked: number; total: number };
export type Scorecard = {
  sections: SectionScore[];
  overall: number | null;
  counts: { good: number; needs_work: number; poor: number; unchecked: number };
  priorities: { section: string; item: string; status: ChecklistStatus; priority: string; recommendation: string }[];
};

const PRIORITY_RANK = { high: 0, medium: 1, low: 2, "": 3 } as const;

/** Reads every checklist in a document. The scorecard is always computed from the current answers, never stored. */
export function computeScorecard(content: DocumentContent): Scorecard {
  const sections: SectionScore[] = [];
  const counts = { good: 0, needs_work: 0, poor: 0, unchecked: 0 };
  const priorities: Scorecard["priorities"] = [];
  let weighted = 0, weight = 0;

  for (const s of content.sections) {
    const items = s.blocks.flatMap((b) => (b.type === "checklist" ? b.items : []));
    if (!items.length) continue;
    const r = checklistScore(items);
    sections.push({ title: s.title, score: r.score, checked: r.checked, total: r.total });
    if (r.score !== null) { weighted += r.score * r.scored; weight += r.scored; }
    for (const i of items) {
      if (i.status === "good") counts.good++; else if (i.status === "needs_work") counts.needs_work++;
      else if (i.status === "poor") counts.poor++; else if (i.status === "unchecked") counts.unchecked++;
      if (i.status === "poor" || i.status === "needs_work") priorities.push({ section: s.title, item: i.item, status: i.status, priority: i.priority, recommendation: i.recommendation });
    }
  }
  priorities.sort((a, b) => (a.status === b.status ? 0 : a.status === "poor" ? -1 : 1) || PRIORITY_RANK[(a.priority || "") as keyof typeof PRIORITY_RANK] - PRIORITY_RANK[(b.priority || "") as keyof typeof PRIORITY_RANK]);
  // High priority first, then poor before needs-work within the same priority.
  priorities.sort((a, b) => PRIORITY_RANK[(a.priority || "") as keyof typeof PRIORITY_RANK] - PRIORITY_RANK[(b.priority || "") as keyof typeof PRIORITY_RANK] || (a.status === b.status ? 0 : a.status === "poor" ? -1 : 1));
  return { sections, overall: weight ? Math.round(weighted / weight) : null, counts, priorities };
}

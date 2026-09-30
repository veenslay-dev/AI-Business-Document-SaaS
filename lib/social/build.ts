import type { BrandContext } from "@/lib/documents/branding";
import type { ClientInfo } from "@/lib/documents/builders";
import { newId, type Block, type DocumentContent, type Section } from "@/lib/documents/content";
import { GENERAL_SECTIONS, LIBRARY, getLibrarySection, platformLabel, type LibrarySection, type PlatformKey } from "./library";

export type SocialAccount = { platform: PlatformKey; handle: string; url: string };

const para = (content: string): Block => ({ id: newId(), type: "paragraph", content });
const section = (title: string, blocks: Block[], extra: Partial<Section> = {}): Section => ({ id: newId("s"), title, hideTitle: false, pageBreakBefore: false, blocks, ...extra });
const blankRows = (cols: number, n: number) => Array.from({ length: n }, () => Array.from({ length: cols }, () => ""));

/** A checklist section built from a library entry. Items start unchecked for the auditor to fill in. */
export function checklistSection(lib: LibrarySection): Section {
  return section(lib.title, [{
    id: newId(), type: "checklist", summary: "",
    items: lib.items.map((item) => ({ id: newId(), item, status: "unchecked" as const, priority: "" as const, note: "", recommendation: "" })),
  }]);
}

/** An empty custom checklist section the auditor names and fills with their own checkpoints. */
export function customChecklistSection(title = "Custom checklist"): Section {
  return section(title, [{ id: newId(), type: "checklist", summary: "", items: [{ id: newId(), item: "", status: "unchecked", priority: "", note: "", recommendation: "" }] }]);
}

/** A free-form findings section for anything the checklists don't cover. */
export function customFindingsSection(title = "Additional findings"): Section {
  return section(title, [{ id: newId(), type: "audit_findings", category: title, findings: [] }]);
}

export function buildSocialAuditContent(args: {
  brand: BrandContext; client: ClientInfo; accounts: SocialAccount[]; sectionKeys?: string[]; date: string; title?: string;
}): DocumentContent {
  const { brand, client, accounts } = args;
  const platformKeys = accounts.map((a) => a.platform);
  // Default: every general section, plus the platform sections for the accounts being audited.
  const keys = args.sectionKeys ?? [...GENERAL_SECTIONS.map((s) => s.key), ...platformKeys];
  const chosen = LIBRARY.filter((l) => keys.includes(l.key));
  const general = chosen.filter((l) => l.group === "general");
  const platform = chosen.filter((l) => l.group === "platform");

  const overview: Section = section("Audit overview", [
    para(`This audit reviews ${client.company}'s social media presence against a checklist covering profiles, content, engagement, growth and results. Each checkpoint is marked Good, Needs work or Poor after reviewing the accounts, with notes and a recommendation.`),
    {
      id: newId(), type: "table", headers: ["Platform", "Handle or link", "Followers", "Posts per week", "Engagement rate", "Notes"],
      rows: accounts.length
        ? accounts.map((a) => [platformLabel(a.platform), a.url || a.handle, "", "", "", ""])
        : blankRows(6, 3),
    },
  ]);

  const sections: Section[] = [
    overview,
    section("Social media scorecard", [{ id: newId(), type: "scorecard", intro: "" }]),
    ...general.map(checklistSection),
    ...platform.map(checklistSection),
    section("Competitor benchmarking", [{
      id: newId(), type: "table", headers: ["Competitor", "Platform", "Followers", "Posts per week", "Engagement rate", "What they do well"], rows: blankRows(6, 4),
    }]),
    customFindingsSection("Key findings and recommendations"),
    section("Action plan", [{ id: newId(), type: "table", headers: ["Priority", "Action", "Owner", "Timeline"], rows: blankRows(4, 5) }]),
    section("Next steps", [
      para("We recommend starting with the items marked high priority, then reviewing progress against this scorecard in 90 days. We're happy to walk through the findings and help put the plan into action."),
      para([brand.company.signatory.name, brand.company.email, brand.company.phone].filter(Boolean).join("  ·  ")),
    ]),
  ];

  return {
    version: 1,
    cover: { kicker: "Social Media Audit", title: args.title || `Social Media Audit: ${client.company}`, subtitle: accounts.length ? accounts.map((a) => platformLabel(a.platform)).join(", ") : "", preparedFor: client.company, preparedBy: brand.company.name, date: args.date, reference: "" },
    client,
    sections,
  };
}

export { getLibrarySection };

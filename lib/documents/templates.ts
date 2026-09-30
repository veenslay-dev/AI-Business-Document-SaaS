import type { DocumentContent } from "./content";

export type DocType = "proposal" | "quotation" | "seo_audit" | "report";

/** Visual configuration. A template changes how a document looks, never what it says. */
export type TemplateConfig = {
  cover: "band" | "split" | "minimal" | "none";
  headings: "serif" | "sans";
  sectionStyle: "numbered" | "ruled" | "plain";
  tableStyle: "striped" | "lined" | "boxed";
  density: "comfortable" | "compact";
  showHeader: boolean;
  showPageNumbers: boolean;
};

export type SystemTemplate = { key: string; name: string; type: DocType; description: string; config: TemplateConfig };

export const SYSTEM_TEMPLATES: SystemTemplate[] = [
  { key: "proposal-modern", name: "Modern", type: "proposal", description: "Full-color cover band, numbered sections, striped tables.",
    config: { cover: "band", headings: "serif", sectionStyle: "numbered", tableStyle: "striped", density: "comfortable", showHeader: true, showPageNumbers: true } },
  { key: "proposal-corporate", name: "Corporate", type: "proposal", description: "Split cover, ruled sections and boxed tables for formal buyers.",
    config: { cover: "split", headings: "sans", sectionStyle: "ruled", tableStyle: "boxed", density: "comfortable", showHeader: true, showPageNumbers: true } },
  { key: "proposal-minimal", name: "Minimal", type: "proposal", description: "Quiet typography, no cover artwork, plenty of white space.",
    config: { cover: "minimal", headings: "serif", sectionStyle: "plain", tableStyle: "lined", density: "comfortable", showHeader: false, showPageNumbers: true } },
  { key: "quotation-professional", name: "Professional", type: "quotation", description: "Letterhead style with a clear itemised table and totals.",
    config: { cover: "none", headings: "sans", sectionStyle: "ruled", tableStyle: "striped", density: "comfortable", showHeader: true, showPageNumbers: true } },
  { key: "quotation-compact", name: "Compact", type: "quotation", description: "Tighter spacing to keep long quotations on fewer pages.",
    config: { cover: "none", headings: "sans", sectionStyle: "plain", tableStyle: "lined", density: "compact", showHeader: true, showPageNumbers: true } },
  { key: "audit-seo-professional", name: "SEO Professional", type: "seo_audit", description: "Cover, score summary and detailed findings with severity tags.",
    config: { cover: "band", headings: "serif", sectionStyle: "numbered", tableStyle: "striped", density: "comfortable", showHeader: true, showPageNumbers: true } },
  { key: "audit-seo-minimal", name: "SEO Minimal", type: "seo_audit", description: "Plain report layout that focuses on the findings.",
    config: { cover: "minimal", headings: "sans", sectionStyle: "plain", tableStyle: "lined", density: "compact", showHeader: false, showPageNumbers: true } },
  { key: "report-standard", name: "Standard report", type: "report", description: "General purpose report layout.",
    config: { cover: "minimal", headings: "serif", sectionStyle: "ruled", tableStyle: "lined", density: "comfortable", showHeader: true, showPageNumbers: true } },
];

export const DEFAULT_TEMPLATE_KEY: Record<DocType, string> = {
  proposal: "proposal-modern", quotation: "quotation-professional", seo_audit: "audit-seo-professional", report: "report-standard",
};

export function getSystemTemplate(key: string | null | undefined): SystemTemplate | null {
  return SYSTEM_TEMPLATES.find((t) => t.key === key) ?? null;
}

export function templatesFor(type: DocType): SystemTemplate[] {
  return SYSTEM_TEMPLATES.filter((t) => t.type === type);
}

/** Sanitises a stored template_config (from a custom workspace template) against the allowed values. */
export function normalizeConfig(raw: unknown, fallback: TemplateConfig): TemplateConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pick = <T extends string>(v: unknown, allowed: readonly T[], d: T): T => (allowed.includes(v as T) ? (v as T) : d);
  return {
    cover: pick(r.cover, ["band", "split", "minimal", "none"], fallback.cover),
    headings: pick(r.headings, ["serif", "sans"], fallback.headings),
    sectionStyle: pick(r.sectionStyle, ["numbered", "ruled", "plain"], fallback.sectionStyle),
    tableStyle: pick(r.tableStyle, ["striped", "lined", "boxed"], fallback.tableStyle),
    density: pick(r.density, ["comfortable", "compact"], fallback.density),
    showHeader: typeof r.showHeader === "boolean" ? r.showHeader : fallback.showHeader,
    showPageNumbers: typeof r.showPageNumbers === "boolean" ? r.showPageNumbers : fallback.showPageNumbers,
  };
}

/** Section structure a saved template contributes (titles only; content stays per document). */
export type SectionOutline = { title: string; hideTitle?: boolean }[];
export function outlineOf(content: DocumentContent): SectionOutline {
  return content.sections.map((s) => ({ title: s.title, hideTitle: s.hideTitle }));
}

/** Keeps only sections named in the outline, in outline order. Sections not in the outline are dropped; unmatched outline entries are skipped. */
export function applyOutline<T extends { title: string }>(sections: T[], outline: SectionOutline): T[] {
  if (!outline.length) return sections;
  const remaining = [...sections];
  const out: T[] = [];
  for (const o of outline) {
    const i = remaining.findIndex((s) => s.title.toLowerCase() === o.title.toLowerCase());
    if (i >= 0) out.push(remaining.splice(i, 1)[0]);
  }
  return out.length ? out : sections;
}

export function fallbackConfig(type: DocType): TemplateConfig {
  return getSystemTemplate(DEFAULT_TEMPLATE_KEY[type])!.config;
}

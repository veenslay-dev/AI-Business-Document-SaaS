import type { DocumentContent } from "./content";

export type DocType = "proposal" | "quotation" | "seo_audit" | "social_audit" | "report";

/** Visual configuration. A template changes how a document looks, never what it says. */
export type TemplateConfig = {
  cover: "band" | "split" | "minimal" | "none" | "block" | "frame";
  /** Header layout when there is no cover page (quotations and audits). */
  headerStyle: "classic" | "banner" | "studio";
  headings: "serif" | "sans";
  sectionStyle: "numbered" | "ruled" | "plain" | "bar";
  tableStyle: "striped" | "lined" | "boxed" | "fill";
  density: "comfortable" | "compact";
  showHeader: boolean;
  showPageNumbers: boolean;
  /** How the grand total is emphasised: a bar under the table, or a bar plus a banner near the top. */
  totals: "bar" | "banner";
  /** A solid brand-colored strip with contact details at the end of the document. */
  footerBar: boolean;
};

export type SystemTemplate = { key: string; name: string; type: DocType; description: string; config: TemplateConfig };

const base: TemplateConfig = {
  cover: "band", headerStyle: "classic", headings: "serif", sectionStyle: "numbered", tableStyle: "striped", density: "comfortable",
  showHeader: true, showPageNumbers: true, totals: "bar", footerBar: false,
};
const tpl = (over: Partial<TemplateConfig>): TemplateConfig => ({ ...base, ...over });

export const SYSTEM_TEMPLATES: SystemTemplate[] = [
  // Proposals
  { key: "proposal-modern", name: "Modern", type: "proposal", description: "Full-color cover band, numbered sections, tinted tables.", config: tpl({}) },
  { key: "proposal-bold", name: "Bold", type: "proposal", description: "Big color block cover, banded section titles and a brand footer strip.", config: tpl({ cover: "block", headings: "sans", sectionStyle: "bar", tableStyle: "fill", footerBar: true }) },
  { key: "proposal-corporate", name: "Corporate", type: "proposal", description: "Split cover, ruled sections and boxed tables for formal buyers.", config: tpl({ cover: "split", headings: "sans", sectionStyle: "ruled", tableStyle: "boxed" }) },
  { key: "proposal-elegant", name: "Elegant", type: "proposal", description: "Framed cover with centred title, serif headings and quiet tables.", config: tpl({ cover: "frame", sectionStyle: "ruled", tableStyle: "lined" }) },
  { key: "proposal-minimal", name: "Minimal", type: "proposal", description: "Quiet typography, no cover artwork, plenty of white space.", config: tpl({ cover: "minimal", sectionStyle: "plain", tableStyle: "lined", showHeader: false }) },
  // Quotations (scope of work documents)
  { key: "quotation-executive", name: "Executive", type: "quotation", description: "Brand-color header banner, total investment strip, scope and payment schedule.", config: tpl({ cover: "none", headerStyle: "banner", headings: "sans", sectionStyle: "bar", tableStyle: "fill", totals: "banner", footerBar: true }) },
  { key: "quotation-studio", name: "Studio", type: "quotation", description: "Large title with a fine rule, tinted rows and a contact footer. Inspired by agency invoices.", config: tpl({ cover: "none", headerStyle: "studio", headings: "sans", sectionStyle: "ruled", tableStyle: "striped", footerBar: false }) },
  { key: "quotation-cover", name: "With cover page", type: "quotation", description: "A proposal-style cover, then the scope, pricing and terms.", config: tpl({ cover: "band", headings: "serif", sectionStyle: "numbered", tableStyle: "fill" }) },
  { key: "quotation-professional", name: "Classic", type: "quotation", description: "Letterhead with logo and address, itemised table and totals.", config: tpl({ cover: "none", headings: "sans", sectionStyle: "ruled" }) },
  { key: "quotation-compact", name: "Compact", type: "quotation", description: "Tighter spacing to keep long quotations on fewer pages.", config: tpl({ cover: "none", headings: "sans", sectionStyle: "plain", tableStyle: "lined", density: "compact" }) },
  // SEO audits
  { key: "audit-seo-professional", name: "SEO Professional", type: "seo_audit", description: "Cover, score summary and detailed findings with severity tags.", config: tpl({ cover: "block", sectionStyle: "bar", tableStyle: "fill", footerBar: true }) },
  { key: "audit-seo-classic", name: "SEO Classic", type: "seo_audit", description: "Band cover with numbered sections.", config: tpl({}) },
  { key: "audit-seo-minimal", name: "SEO Minimal", type: "seo_audit", description: "Plain report layout that focuses on the findings.", config: tpl({ cover: "minimal", headings: "sans", sectionStyle: "plain", tableStyle: "lined", density: "compact", showHeader: false }) },
  // Social media audits
  { key: "social-audit-scorecard", name: "Scorecard", type: "social_audit", description: "Block cover, scorecard first, checklists with clear status tags.", config: tpl({ cover: "block", headings: "sans", sectionStyle: "bar", tableStyle: "fill", footerBar: true }) },
  { key: "social-audit-clean", name: "Clean", type: "social_audit", description: "Letterhead style report with ruled sections.", config: tpl({ cover: "none", headerStyle: "studio", headings: "sans", sectionStyle: "ruled", tableStyle: "striped" }) },
  { key: "report-standard", name: "Standard report", type: "report", description: "General purpose report layout.", config: tpl({ cover: "minimal", sectionStyle: "ruled", tableStyle: "lined" }) },
];

export const DEFAULT_TEMPLATE_KEY: Record<DocType, string> = {
  proposal: "proposal-modern", quotation: "quotation-executive", seo_audit: "audit-seo-professional", social_audit: "social-audit-scorecard", report: "report-standard",
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
  const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
  return {
    cover: pick(r.cover, ["band", "split", "minimal", "none", "block", "frame"], fallback.cover),
    headerStyle: pick(r.headerStyle, ["classic", "banner", "studio"], fallback.headerStyle),
    headings: pick(r.headings, ["serif", "sans"], fallback.headings),
    sectionStyle: pick(r.sectionStyle, ["numbered", "ruled", "plain", "bar"], fallback.sectionStyle),
    tableStyle: pick(r.tableStyle, ["striped", "lined", "boxed", "fill"], fallback.tableStyle),
    density: pick(r.density, ["comfortable", "compact"], fallback.density),
    showHeader: bool(r.showHeader, fallback.showHeader),
    showPageNumbers: bool(r.showPageNumbers, fallback.showPageNumbers),
    totals: pick(r.totals, ["bar", "banner"], fallback.totals),
    footerBar: bool(r.footerBar, fallback.footerBar),
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

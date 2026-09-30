import type { DocumentContent } from "./content";

export type DocType = "proposal" | "quotation" | "invoice" | "seo_audit" | "social_audit" | "report";

/** Visual configuration. A template changes how a document looks, never what it says. */
export type TemplateConfig = {
  cover: "band" | "split" | "minimal" | "none" | "block" | "frame" | "noir" | "aurora" | "sidebar";
  /** Header layout when there is no cover page (quotations and audits). */
  headerStyle: "classic" | "banner" | "studio";
  headings: "serif" | "sans";
  sectionStyle: "numbered" | "ruled" | "plain" | "bar" | "card";
  tableStyle: "striped" | "lined" | "boxed" | "fill";
  density: "comfortable" | "compact";
  showHeader: boolean;
  showPageNumbers: boolean;
  /** How the grand total is emphasised: a bar under the table, or a bar plus a banner near the top. */
  totals: "bar" | "banner";
  /** A solid brand-colored strip with contact details at the end of the document. */
  footerBar: boolean;
  /** A contents page after the cover, listing the sections. */
  toc: boolean;
  /** Every section starts on its own page, like a report with one page per topic. */
  pagePerSection: boolean;
};

export type SystemTemplate = { key: string; name: string; type: DocType; description: string; config: TemplateConfig };

const base: TemplateConfig = {
  cover: "band", headerStyle: "classic", headings: "serif", sectionStyle: "numbered", tableStyle: "striped", density: "comfortable",
  showHeader: true, showPageNumbers: true, totals: "bar", footerBar: false, toc: false, pagePerSection: false,
};
const tpl = (over: Partial<TemplateConfig>): TemplateConfig => ({ ...base, ...over });

export const SYSTEM_TEMPLATES: SystemTemplate[] = [
  // Proposals
  { key: "proposal-modern", name: "Modern", type: "proposal", description: "Full-color cover band, numbered sections, tinted tables.", config: tpl({}) },
  { key: "proposal-bold", name: "Bold", type: "proposal", description: "Big color block cover, banded section titles and a brand footer strip.", config: tpl({ cover: "block", headings: "sans", sectionStyle: "bar", tableStyle: "fill", footerBar: true }) },
  { key: "proposal-corporate", name: "Corporate", type: "proposal", description: "Split cover, ruled sections and boxed tables for formal buyers.", config: tpl({ cover: "split", headings: "sans", sectionStyle: "ruled", tableStyle: "boxed" }) },
  { key: "proposal-elegant", name: "Elegant", type: "proposal", description: "Framed cover with centred title, serif headings and quiet tables.", config: tpl({ cover: "frame", sectionStyle: "ruled", tableStyle: "lined" }) },
  { key: "proposal-minimal", name: "Minimal", type: "proposal", description: "Quiet typography, no cover artwork, plenty of white space.", config: tpl({ cover: "minimal", sectionStyle: "plain", tableStyle: "lined", showHeader: false }) },
  // Invoices
  { key: "invoice-executive", name: "Executive", type: "invoice", description: "Brand-color header banner and an amount due strip.", config: tpl({ cover: "none", headerStyle: "banner", headings: "sans", sectionStyle: "bar", tableStyle: "fill", totals: "banner", footerBar: true }) },
  { key: "invoice-studio", name: "Studio", type: "invoice", description: "Large title with a fine rule and tinted rows, like an agency invoice.", config: tpl({ cover: "none", headerStyle: "studio", headings: "sans", sectionStyle: "ruled", tableStyle: "striped", footerBar: false }) },
  { key: "invoice-classic", name: "Classic", type: "invoice", description: "Letterhead with logo and address, then a clean itemised table.", config: tpl({ cover: "none", headings: "sans", sectionStyle: "ruled", tableStyle: "lined" }) },
  // Quotations (scope of work documents)
  { key: "quotation-executive", name: "Executive", type: "quotation", description: "Brand-color header banner, total investment strip, scope and payment schedule.", config: tpl({ cover: "none", headerStyle: "banner", headings: "sans", sectionStyle: "bar", tableStyle: "fill", totals: "banner", footerBar: true }) },
  { key: "quotation-studio", name: "Studio", type: "quotation", description: "Large title with a fine rule, tinted rows and a contact footer. Inspired by agency invoices.", config: tpl({ cover: "none", headerStyle: "studio", headings: "sans", sectionStyle: "ruled", tableStyle: "striped", footerBar: false }) },
  { key: "quotation-cover", name: "With cover page", type: "quotation", description: "A proposal-style cover, then the scope, pricing and terms.", config: tpl({ cover: "band", headings: "serif", sectionStyle: "numbered", tableStyle: "fill" }) },
  { key: "quotation-professional", name: "Classic", type: "quotation", description: "Letterhead with logo and address, itemised table and totals.", config: tpl({ cover: "none", headings: "sans", sectionStyle: "ruled" }) },
  { key: "quotation-compact", name: "Compact", type: "quotation", description: "Tighter spacing to keep long quotations on fewer pages.", config: tpl({ cover: "none", headings: "sans", sectionStyle: "plain", tableStyle: "lined", density: "compact" }) },
  // SEO audits
  // Premium report layouts, one page per topic with a contents page
  { key: "audit-seo-noir", name: "Noir report", type: "seo_audit", description: "Black cover with a color corner, contents page and one page per topic with a findings card. Inspired by agency audit reports.", config: tpl({ cover: "noir", headings: "sans", sectionStyle: "card", tableStyle: "fill", toc: true, pagePerSection: true }) },
  { key: "audit-seo-aurora", name: "Aurora report", type: "seo_audit", description: "Gradient cover in your brand colors, contents page, numbered sections with charts.", config: tpl({ cover: "aurora", headings: "sans", sectionStyle: "numbered", tableStyle: "striped", toc: true }) },
  { key: "audit-seo-sidebar", name: "Sidebar report", type: "seo_audit", description: "Cover with a color sidebar for details, contents page, ruled sections and a contact footer.", config: tpl({ cover: "sidebar", headings: "serif", sectionStyle: "ruled", tableStyle: "boxed", toc: true, footerBar: true }) },
  { key: "audit-seo-professional", name: "SEO Professional", type: "seo_audit", description: "Cover, score summary and detailed findings with severity tags.", config: tpl({ cover: "block", sectionStyle: "bar", tableStyle: "fill", footerBar: true }) },
  { key: "audit-seo-classic", name: "SEO Classic", type: "seo_audit", description: "Band cover with numbered sections.", config: tpl({}) },
  { key: "audit-seo-minimal", name: "SEO Minimal", type: "seo_audit", description: "Plain report layout that focuses on the findings.", config: tpl({ cover: "minimal", headings: "sans", sectionStyle: "plain", tableStyle: "lined", density: "compact", showHeader: false }) },
  // Social media audits
  { key: "social-audit-noir", name: "Noir report", type: "social_audit", description: "Black cover, contents page and one page per platform with a findings card.", config: tpl({ cover: "noir", headings: "sans", sectionStyle: "card", tableStyle: "fill", toc: true, pagePerSection: true }) },
  { key: "social-audit-aurora", name: "Aurora report", type: "social_audit", description: "Gradient cover in your brand colors with the scorecard and charts up front.", config: tpl({ cover: "aurora", headings: "sans", sectionStyle: "numbered", tableStyle: "striped", toc: true }) },
  { key: "social-audit-sidebar", name: "Sidebar report", type: "social_audit", description: "Sidebar cover, contents page, ruled sections and a contact footer.", config: tpl({ cover: "sidebar", headings: "serif", sectionStyle: "ruled", tableStyle: "boxed", toc: true, footerBar: true }) },
  { key: "social-audit-scorecard", name: "Scorecard", type: "social_audit", description: "Block cover, scorecard first, checklists with clear status tags.", config: tpl({ cover: "block", headings: "sans", sectionStyle: "bar", tableStyle: "fill", footerBar: true }) },
  { key: "social-audit-clean", name: "Clean", type: "social_audit", description: "Letterhead style report with ruled sections.", config: tpl({ cover: "none", headerStyle: "studio", headings: "sans", sectionStyle: "ruled", tableStyle: "striped" }) },
  { key: "report-standard", name: "Standard report", type: "report", description: "General purpose report layout.", config: tpl({ cover: "minimal", sectionStyle: "ruled", tableStyle: "lined" }) },
];

export const DEFAULT_TEMPLATE_KEY: Record<DocType, string> = {
  proposal: "proposal-modern", quotation: "quotation-executive", invoice: "invoice-executive", seo_audit: "audit-seo-professional", social_audit: "social-audit-scorecard", report: "report-standard",
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
    cover: pick(r.cover, ["band", "split", "minimal", "none", "block", "frame", "noir", "aurora", "sidebar"], fallback.cover),
    headerStyle: pick(r.headerStyle, ["classic", "banner", "studio"], fallback.headerStyle),
    headings: pick(r.headings, ["serif", "sans"], fallback.headings),
    sectionStyle: pick(r.sectionStyle, ["numbered", "ruled", "plain", "bar", "card"], fallback.sectionStyle),
    tableStyle: pick(r.tableStyle, ["striped", "lined", "boxed", "fill"], fallback.tableStyle),
    density: pick(r.density, ["comfortable", "compact"], fallback.density),
    showHeader: bool(r.showHeader, fallback.showHeader),
    showPageNumbers: bool(r.showPageNumbers, fallback.showPageNumbers),
    totals: pick(r.totals, ["bar", "banner"], fallback.totals),
    footerBar: bool(r.footerBar, fallback.footerBar),
    toc: bool(r.toc, fallback.toc),
    pagePerSection: bool(r.pagePerSection, fallback.pagePerSection),
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

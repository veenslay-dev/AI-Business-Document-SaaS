import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { DocumentRenderer } from "@/components/documents/document-renderer";
import { computeAuditStats } from "@/lib/documents/audit-stats";
import { ensureReadableOn, contrastRatio, pageTheme } from "@/lib/documents/branding";
import { documentContentSchema } from "@/lib/documents/content";
import { BODY_FONTS, HEADING_FONTS, fontStack } from "@/lib/documents/fonts";
import { ACME_BRAND, sampleAudit, sampleInvoice, sampleQuotation } from "@/lib/documents/samples";
import { SYSTEM_TEMPLATES, getSystemTemplate, normalizeConfig, templatesFor } from "@/lib/documents/templates";
import { seoChecklistBlock } from "@/lib/audit/checklist";
import { analyze } from "@/lib/audit/analyze";
import { SAMPLE_SIGNALS } from "@/lib/documents/samples";

const render = (content: ReturnType<typeof sampleInvoice>, key: string, type: "invoice" | "quotation" | "seo_audit" = "invoice") =>
  renderToStaticMarkup(createElement(DocumentRenderer, { content, brand: ACME_BRAND, template: getSystemTemplate(key)!.config, meta: { type } }));

describe("invoices", () => {
  it("hides tax and discount columns and rows when nothing uses them", () => {
    const html = render(sampleInvoice(undefined, false), "invoice-executive");
    expect(html).toContain("Amount due");
    expect(html).not.toContain(">Discount<");
    expect(html).not.toContain(">GST<");
    expect(html).not.toContain("Subtotal");
  });
  it("shows the tax column and totals when tax applies", () => {
    const html = render(sampleInvoice(undefined, true), "invoice-executive");
    expect(html).toContain(">GST<");
    expect(html).toContain("Subtotal");
  });
  it("shows the discount column only when a line has a discount", () => {
    expect(render(sampleQuotation(), "quotation-executive", "quotation")).toContain(">Discount<");
  });
  it("has three invoice templates with a valid default", () => {
    expect(templatesFor("invoice").map((t) => t.key)).toEqual(["invoice-executive", "invoice-studio", "invoice-classic"]);
  });
  it("labels the date as due date", () => {
    expect(render(sampleInvoice(), "invoice-classic")).toContain("Due date");
  });
});

describe("premium report templates", () => {
  it("adds three per audit type with contents and page-per-topic options", () => {
    for (const t of ["seo_audit", "social_audit"] as const) {
      const premium = templatesFor(t).filter((x) => x.config.toc);
      expect(premium.length).toBe(3);
    }
  });
  it("renders a contents page, charts and the findings bar", () => {
    const html = render(sampleAudit(), "audit-seo-noir", "seo_audit");
    expect(html).toContain('class="toc"');
    expect(html).toContain("Findings &amp; Recommendations");
    expect(html).toContain("Issues at a glance");
    expect(html).toContain("chart pie");
    expect(html).toContain("cover noir");
  });
  it("keeps every system template config valid", () => {
    for (const t of SYSTEM_TEMPLATES) expect(normalizeConfig(t.config, t.config)).toEqual(t.config);
  });
  it("counts findings by severity", () => {
    const st = computeAuditStats(sampleAudit());
    expect(st.total).toBeGreaterThan(5);
    expect(st.categories.length).toBeGreaterThan(2);
  });
});

describe("SEO checklist and new checks", () => {
  it("prefills the 15-point checklist from the scan and leaves manual items unchecked", () => {
    const block = seoChecklistBlock(analyze(SAMPLE_SIGNALS));
    expect(block.items).toHaveLength(15);
    expect(block.items.find((i) => i.item.startsWith("Backlink"))?.status).toBe("unchecked");
    expect(block.items.find((i) => i.item.startsWith("On-page"))?.status).not.toBe("unchecked");
  });
  it("flags missing analytics, mixed versions and a soft 404", () => {
    const s = { ...SAMPLE_SIGNALS, home: { ...SAMPLE_SIGNALS.home, analytics: [], openGraph: false, twitterCard: false, searchConsoleVerified: false },
      notFound: { status: 200, custom: false }, variants: [{ url: "http://a/", final: "http://a" }, { url: "https://a/", final: "https://a" }, { url: "https://www.a/", final: "https://www.a" }] };
    const ids = analyze(s).filter((f) => f.severity !== "passed").map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(["analytics", "search-console", "open-graph", "twitter-card", "404-page", "versions"]));
  });
  it("still analyzes older scans without the new signals", () => {
    expect(() => analyze(SAMPLE_SIGNALS)).not.toThrow();
  });
});

describe("fonts, screenshots and page color", () => {
  it("offers at least ten more heading fonts and every one has a stack", () => {
    expect(HEADING_FONTS.length).toBeGreaterThanOrEqual(19);
    for (const f of [...HEADING_FONTS, ...BODY_FONTS]) expect(fontStack(f)).toContain(f);
  });
  it("hides an empty gallery and shows screenshots only when attached", () => {
    const base = sampleAudit();
    const withEmpty = { ...base, sections: [...base.sections, { id: "sx", title: "Screenshots", hideTitle: false, pageBreakBefore: false, blocks: [{ id: "g", type: "gallery" as const, columns: 2 as const, items: [] }] }] };
    expect(render(withEmpty, "audit-seo-classic", "seo_audit")).not.toContain(">Screenshots<");
    const withImg = { ...withEmpty, sections: withEmpty.sections.map((s) => s.id === "sx" ? { ...s, blocks: [{ id: "g", type: "gallery" as const, columns: 2 as const, items: [{ id: "a", url: "https://example.com/a.png", caption: "Home page" }] }] } : s) };
    const html = render(withImg, "audit-seo-classic", "seo_audit");
    expect(html).toContain(">Screenshots<");
    expect(html).toContain("Home page");
  });
  it("applies the page background and keeps text readable on dark pages", () => {
    const html = render({ ...sampleInvoice(), style: { background: "#0f172a" } }, "invoice-classic");
    expect(html).toContain("--paper:#0f172a");
    const t = pageTheme("#0f172a", "#dddddd");
    expect(t.dark).toBe(true);
    expect(contrastRatio(t.ink, t.paper)).toBeGreaterThan(7);
    expect(contrastRatio(ensureReadableOn("#1e3a8a", "#0f172a"), "#0f172a")).toBeGreaterThanOrEqual(4.5);
  });
  it("rejects an invalid page background", () => {
    expect(documentContentSchema.safeParse({ ...sampleInvoice(), style: { background: "red" } }).success).toBe(false);
  });
});

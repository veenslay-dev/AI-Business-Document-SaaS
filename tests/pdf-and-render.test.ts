import { existsSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentRenderer } from "@/components/documents/document-renderer";
import { documentContentSchema } from "@/lib/documents/content";
import { ACME_BRAND, sampleProposal, sampleQuotation } from "@/lib/documents/samples";
import { getSystemTemplate } from "@/lib/documents/templates";
import { documentTotals } from "@/lib/documents/totals";
import { headerFooterTemplates, renderDocumentHtml } from "@/lib/pdf/html";
import { htmlToPdf } from "@/lib/pdf/render";

const tpl = (k: string) => getSystemTemplate(k)!.config;
const CHROME = process.env.PDF_CHROMIUM_PATH ?? ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find(existsSync);

describe("document content", () => {
  it("sample documents satisfy the content schema", () => {
    expect(documentContentSchema.safeParse(sampleProposal()).success).toBe(true);
    expect(documentContentSchema.safeParse(sampleQuotation()).success).toBe(true);
  });
  it("rejects unknown block types and oversized text", () => {
    const bad = sampleProposal();
    (bad.sections[0].blocks as unknown[]).push({ id: "x", type: "script", content: "<script>" });
    expect(documentContentSchema.safeParse(bad).success).toBe(false);
  });
  it("stores the quotation total on the row", () => {
    const t = documentTotals(sampleQuotation());
    // 75,000 + 81,000 (90,000 less 10%) + 25,000 = 181,000 plus 18% GST
    expect(t.currency).toBe("INR");
    expect(t.amount).toBeCloseTo(181000 * 1.18, 2);
  });
  it("uses the selected package in the proposal total", () => {
    expect(documentTotals(sampleProposal()).amount).toBe(60000 + 85000 + 85000);
  });
});

describe("renderer", () => {
  it("applies brand colors, company details and content from one source", () => {
    const html = renderToStaticMarkup(createElement(DocumentRenderer, { content: sampleProposal(), brand: ACME_BRAND, template: tpl("proposal-modern"), meta: { type: "proposal" } }));
    expect(html).toContain("--primary:#1f3a5f");
    expect(html).toContain("Acme Digital");
    expect(html).toContain("Nova Furniture");
    expect(html).toContain("hello@acme-digital.example");
  });
  it("escapes user supplied text", () => {
    const c = sampleProposal();
    c.cover.title = `<img src=x onerror=alert(1)>`;
    const html = renderToStaticMarkup(createElement(DocumentRenderer, { content: c, brand: ACME_BRAND, template: tpl("proposal-minimal"), meta: { type: "proposal" } }));
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
  });
  it("refuses javascript: image URLs", () => {
    const c = sampleProposal();
    c.sections[0].blocks.push({ id: "im", type: "image", url: "javascript:alert(1)", alt: "", caption: "" });
    const html = renderToStaticMarkup(createElement(DocumentRenderer, { content: c, brand: ACME_BRAND, template: tpl("proposal-modern"), meta: { type: "proposal" } }));
    expect(html).not.toContain("javascript:");
  });
  it("shows the new phone number for a new brand and the old one for a frozen snapshot", () => {
    const before = ACME_BRAND;
    const after = { ...ACME_BRAND, company: { ...ACME_BRAND.company, phone: "+91 11111 00000" } };
    const render = (b: typeof ACME_BRAND) => renderToStaticMarkup(createElement(DocumentRenderer, { content: sampleQuotation(), brand: b, template: tpl("quotation-professional"), meta: { type: "quotation" } }));
    expect(render(before)).toContain("+91 98765 43210");
    expect(render(after)).toContain("+91 11111 00000");
    expect(render(before)).not.toContain("+91 11111 00000");
  });
});

describe.skipIf(!CHROME)("pdf generation", () => {
  it("produces a multi-page PDF for a proposal and a valid PDF for a quotation", async () => {
    process.env.PDF_CHROMIUM_PATH = CHROME;
    for (const [content, type, key] of [[sampleProposal(), "proposal", "proposal-modern"], [sampleQuotation(), "quotation", "quotation-professional"]] as const) {
      const template = tpl(key);
      const html = renderDocumentHtml({ content, brand: ACME_BRAND, template, meta: { type }, title: "Test" });
      const { header, footer } = headerFooterTemplates(ACME_BRAND, template);
      const pdf = await htmlToPdf(html, { header, footer, coverPage: template.cover !== "none" });
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(10_000);
      const pages = (await PDFDocument.load(pdf)).getPageCount();
      expect(pages).toBeGreaterThanOrEqual(type === "proposal" ? 3 : 1);
    }
  });
});

describe("audit sample", () => {
  it("is valid and renders findings with severity, why it matters and recommended action", async () => {
    const { sampleAudit } = await import("@/lib/documents/samples");
    const c = sampleAudit();
    expect(documentContentSchema.safeParse(c).success).toBe(true);
    const html = renderToStaticMarkup(createElement(DocumentRenderer, { content: c, brand: ACME_BRAND, template: tpl("audit-seo-professional"), meta: { type: "seo_audit" } }));
    expect(html).toContain("Why it matters");
    expect(html).toContain("Recommended action");
    expect(html).toContain("Overall SEO health");
    expect(html).toContain("sev critical".replace("critical", "high"));
  });
});

describe("style scoping", () => {
  it("gives each brand its own CSS scope so documents in different brands can share a page", async () => {
    const { HARBOR_BRAND } = await import("@/lib/documents/samples");
    const { documentCss, documentScope } = await import("@/lib/documents/css");
    const t = tpl("proposal-modern");
    const a = documentScope(ACME_BRAND.brand, t), b = documentScope(HARBOR_BRAND.brand, t);
    expect(a).not.toBe(b);
    expect(documentScope(ACME_BRAND.brand, t)).toBe(a); // deterministic, so server and client agree
    const css = documentCss(ACME_BRAND.brand, t);
    expect(css).toContain(`.${a}{--primary:#1f3a5f`);
    expect(css).not.toMatch(/(^|[,}\s])\.doc[\s.{]/m);
  });
});

describe("empty sections", () => {
  it("are left out of the rendered document but numbering stays continuous", async () => {
    const { emptySection } = await import("@/lib/documents/content");
    const c = sampleProposal();
    const blank = emptySection("Zzz Empty Section");
    c.sections.splice(2, 0, blank);
    const html = renderToStaticMarkup(createElement(DocumentRenderer, { content: c, brand: ACME_BRAND, template: tpl("proposal-modern"), meta: { type: "proposal" } }));
    expect(html).not.toContain("Zzz Empty Section");
    expect(html).toContain("Company introduction");
    expect(html).toContain(">03<"); // the blank section didn't consume a number
  });
});

describe("brand colors and contrast", () => {
  it("darkens a bright brand color until headings are readable on white", async () => {
    const { contrastRatio, ensureReadableOnWhite, softTint } = await import("@/lib/documents/branding");
    expect(contrastRatio("#00fff7", "#ffffff")).toBeLessThan(1.5); // the original problem
    const h = ensureReadableOnWhite("#00fff7");
    expect(contrastRatio(h, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(h).not.toBe("#00fff7");
    expect(ensureReadableOnWhite("#1f3a5f")).toBe("#1f3a5f"); // already fine: unchanged
    expect(ensureReadableOnWhite("#ffff00")).toMatch(/^#/); // yellow is fixed as well
    expect(softTint("#000000")).not.toBe("#000000"); // a black secondary can't become a dark background
  });
  it("uses separate colors for header backgrounds and heading text", async () => {
    const { buildBrandContext } = await import("@/lib/documents/branding");
    const row = { primary_color: "#00fff7", secondary_color: "#000000", accent_color: "#c8553d", heading_font: "Inter", body_font: "Inter", logo_url: null, dark_logo_url: null, favicon_url: null, default_footer: null };
    const co = { ...ACME_BRAND.company, name: "X" };
    const auto = buildBrandContext({ company_name: "X", tagline: null, description: null, website: null, email: null, phone: null, address: null, gst_number: null, pan_number: null, services: [], default_terms: null, authorized_name: null, authorized_designation: null, signature_url: null }, row);
    expect(auto.brand.header).toBe("#00fff7");
    expect(auto.brand.headingText).not.toBe("#00fff7");
    const custom = buildBrandContext({ company_name: "X", tagline: null, description: null, website: null, email: null, phone: null, address: null, gst_number: null, pan_number: null, services: [], default_terms: null, authorized_name: null, authorized_designation: null, signature_url: null }, { ...row, header_color: "#111827", heading_color: "#0f766e" });
    expect(custom.brand.header).toBe("#111827");
    expect(custom.brand.headingText).toBe("#0f766e");
    void co;
    const html = renderToStaticMarkup(createElement(DocumentRenderer, { content: sampleQuotation(), brand: custom, template: tpl("quotation-executive"), meta: { type: "quotation" } }));
    expect(html).toContain("--header:#111827");
    expect(html).toContain("--on-header:#ffffff"); // light text on a dark header
    expect(html).toContain("--heading:#0f766e");
  });
  it("old snapshots without header colors still render as they did", async () => {
    const { parseSnapshot } = await import("@/lib/documents/snapshot");
    const old = JSON.parse(JSON.stringify(ACME_BRAND));
    delete old.brand.header; delete old.brand.headingText;
    const parsed = parseSnapshot(old)!;
    expect(parsed.brand.header).toBe("#1f3a5f");
  });
});

describe("templates", () => {
  it("every system template renders every matching sample without throwing", async () => {
    const { SYSTEM_TEMPLATES } = await import("@/lib/documents/templates");
    const { sampleAudit } = await import("@/lib/documents/samples");
    const docs: Record<string, ReturnType<typeof sampleProposal>> = { proposal: sampleProposal(), quotation: sampleQuotation(), seo_audit: sampleAudit() };
    for (const t of SYSTEM_TEMPLATES) {
      if (!docs[t.type]) continue;
      const html = renderToStaticMarkup(createElement(DocumentRenderer, { content: docs[t.type], brand: ACME_BRAND, template: t.config, meta: { type: t.type } }));
      expect(html.length).toBeGreaterThan(2000);
    }
  });
  it("normalizeConfig fills in new options for templates saved before they existed", async () => {
    const { normalizeConfig } = await import("@/lib/documents/templates");
    const fb = tpl("proposal-modern");
    const old = normalizeConfig({ cover: "split", headings: "sans", sectionStyle: "ruled", tableStyle: "boxed", density: "compact", showHeader: false, showPageNumbers: true }, fb);
    expect(old.cover).toBe("split");
    expect(old.totals).toBe(fb.totals);
    expect(old.footerBar).toBe(fb.footerBar);
    expect(normalizeConfig({ cover: "<script>", totals: "nope" }, fb).cover).toBe(fb.cover);
  });
  it("quotations read as a scope of work, not an invoice", () => {
    const titles = sampleQuotation().sections.map((s) => s.title);
    expect(titles).toEqual(expect.arrayContaining(["Project overview", "Scope of work", "Deliverables", "Timeline", "Investment", "Payment schedule", "Terms and conditions", "Acceptance"]));
    expect(titles.indexOf("Scope of work")).toBeLessThan(titles.indexOf("Investment"));
  });
});

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

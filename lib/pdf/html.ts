import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentRenderer, type RenderMeta } from "@/components/documents/document-renderer";
import type { BrandContext } from "@/lib/documents/branding";
import type { DocumentContent } from "@/lib/documents/content";
import type { TemplateConfig } from "@/lib/documents/templates";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Full HTML page for printing. The body is the same DocumentRenderer the editor and public page use. */
export function renderDocumentHtml(args: { content: DocumentContent; brand: BrandContext; template: TemplateConfig; meta: RenderMeta; title: string }): string {
  const body = renderToStaticMarkup(createElement(DocumentRenderer, { content: args.content, brand: args.brand, template: args.template, meta: args.meta }));
  const hasCover = args.template.cover !== "none";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(args.title)}</title>
<style>
@page{size:A4;margin:18mm 16mm 20mm}
${hasCover ? "@page :first{margin:0}" : ""}
html,body{margin:0;padding:0;background:#fff}
@media print{.doc .cover{height:297mm;min-height:297mm;padding:22mm 20mm}}
</style></head><body>${body}</body></html>`;
}

/** Running header and footer for pages after the cover. Chromium renders these outside the page body, so styles must be inline. */
export function headerFooterTemplates(brand: BrandContext, template: TemplateConfig) {
  const base = "font-family:Helvetica,Arial,sans-serif;font-size:8px;color:#5b616d;width:100%;padding:0 16mm;";
  const footerText = brand.brand.footer ?? [brand.company.name, brand.company.email, brand.company.phone, brand.company.website].filter(Boolean).join("  |  ");
  return {
    header: template.showHeader
      ? `<div style="${base}display:flex;justify-content:space-between;"><span>${esc(brand.company.name)}</span><span>${esc(brand.company.tagline ?? "")}</span></div>`
      : `<span></span>`,
    footer: `<div style="${base}display:flex;justify-content:space-between;"><span>${esc(footerText)}</span>${template.showPageNumbers ? `<span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>` : "<span></span>"}</div>`,
  };
}

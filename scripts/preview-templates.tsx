/**
 * Renders every built-in template with a chosen brand to HTML files, for eyeballing design changes.
 *   npx tsx scripts/preview-templates.tsx <outDir>
 * Open the files in a browser, or screenshot them with Playwright.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentRenderer } from "../components/documents/document-renderer";
import { buildBrandContext } from "../lib/documents/branding";
import { ACME_BRAND, sampleAudit, sampleProposal, sampleQuotation, sampleSocialAudit } from "../lib/documents/samples";
import { SYSTEM_TEMPLATES } from "../lib/documents/templates";

const out = process.argv[2] ?? "./preview";
mkdirSync(out, { recursive: true });
const cyan = buildBrandContext(
  { ...ACME_BRAND.company, company_name: "Rankprodigy", services: ACME_BRAND.company.services, default_terms: ACME_BRAND.company.terms, authorized_name: "Naveen Pandey", authorized_designation: "Founder", signature_url: null,
    tagline: null, description: ACME_BRAND.company.description, website: "https://rankprodigy.in", email: "business@rankprodigy.in", phone: "9315313967", address: "H.no.282, Block C, Kamal Pur, Burari, Delhi", gst_number: null, pan_number: null },
  { primary_color: "#00fff7", secondary_color: "#000000", accent_color: "#c8553d", heading_font: "Space Grotesk", body_font: "DM Sans", logo_url: null, dark_logo_url: null, favicon_url: null, default_footer: null, header_color: null, heading_color: null },
);
const navy = ACME_BRAND;
const docs = { proposal: sampleProposal(), quotation: sampleQuotation(), seo_audit: sampleAudit(), social_audit: sampleSocialAudit() } as const;

for (const t of SYSTEM_TEMPLATES) {
  const content = (docs as Record<string, ReturnType<typeof sampleProposal>>)[t.type];
  if (!content) continue;
  for (const [bn, brand] of [["cyan", cyan], ["navy", navy]] as const) {
    const html = renderToStaticMarkup(createElement(DocumentRenderer, { content, brand, template: t.config, meta: { type: t.type } }));
    writeFileSync(`${out}/${t.key}.${bn}.html`, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888"><div style="width:820px;margin:0 auto">${html}</div>`);
  }
}
console.log("wrote", SYSTEM_TEMPLATES.length, "templates to", out);

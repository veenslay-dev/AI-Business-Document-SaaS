import type { ComponentProps } from "react";
import { DocumentRenderer } from "@/components/documents/document-renderer";
import { DeferredFonts } from "@/components/marketing/deferred-fonts";
import { renderToStaticMarkup } from "@/lib/pdf/static-markup";

/**
 * Turns every heading in a piece of HTML into a styled block. The document stylesheet matches both forms
 * (see lib/documents/css.ts), so the look is identical, but search engines no longer count a sample document's
 * titles and section names as headings of the marketing page around it.
 */
export function demoteHeadings(html: string): string {
  return html.replace(/<(\/?)h([1-6])(?=[\s>])/gi, (_m, close: string, level: string) => (close ? "</div" : `<div data-h="${level}"`));
}

/** Pulls Google Fonts stylesheet links out of HTML so they can be loaded later, without blocking the page. */
export function splitFontLinks(html: string): { html: string; hrefs: string[] } {
  const hrefs: string[] = [];
  const out = html.replace(/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com\/[^"]+)"\s*\/?>/g, (_m, href: string) => { hrefs.push(href.replace(/&amp;/g, "&")); return ""; });
  return { html: out, hrefs };
}

/** A sample document for a marketing page: the real renderer, shown as an illustration rather than as page content. */
export function StaticDocument(props: ComponentProps<typeof DocumentRenderer>) {
  const doc = <DocumentRenderer {...props} />;
  let html: string | null = null;
  let hrefs: string[] = [];
  try {
    const split = splitFontLinks(demoteHeadings(renderToStaticMarkup(doc)));
    html = split.html; hrefs = split.hrefs;
  } catch (e) {
    // The renderer is loaded at runtime. If a deployment ever lacks it, show the sample as it is rather than failing the whole page.
    console.error("[static-document] using the plain preview:", e instanceof Error ? e.message : "unknown");
  }
  return html !== null ? <><div dangerouslySetInnerHTML={{ __html: html }} />{hrefs.length > 0 && <DeferredFonts hrefs={hrefs} />}</> : doc;
}

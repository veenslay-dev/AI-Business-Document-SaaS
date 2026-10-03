import type { ComponentProps } from "react";
import { DocumentRenderer } from "@/components/documents/document-renderer";
import { renderToStaticMarkup } from "@/lib/pdf/static-markup";

/**
 * Turns every heading in a piece of HTML into a styled block. The document stylesheet matches both forms
 * (see lib/documents/css.ts), so the look is identical, but search engines no longer count a sample document's
 * titles and section names as headings of the marketing page around it.
 */
export function demoteHeadings(html: string): string {
  return html.replace(/<(\/?)h([1-6])(?=[\s>])/gi, (_m, close: string, level: string) => (close ? "</div" : `<div data-h="${level}"`));
}

/** A sample document for a marketing page: the real renderer, shown as an illustration rather than as page content. */
export function StaticDocument(props: ComponentProps<typeof DocumentRenderer>) {
  const doc = <DocumentRenderer {...props} />;
  let html: string | null = null;
  try {
    html = demoteHeadings(renderToStaticMarkup(doc));
  } catch (e) {
    // The renderer is loaded at runtime. If a deployment ever lacks it, show the sample as it is rather than failing the whole page.
    console.error("[static-document] using the plain preview:", e instanceof Error ? e.message : "unknown");
  }
  return html !== null ? <div dangerouslySetInnerHTML={{ __html: html }} /> : doc;
}

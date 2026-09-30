import "server-only";
import { headerFooterTemplates, renderDocumentHtml } from "@/lib/pdf/html";
import { htmlToPdf } from "@/lib/pdf/render";
import type { RenderData } from "./render";
import type { DocType } from "@/lib/documents/templates";
import type { Acceptance } from "@/components/documents/document-renderer";

export async function documentToPdf(args: { render: RenderData; type: DocType; title: string; acceptance?: Acceptance | null }) {
  const html = renderDocumentHtml({ content: args.render.content, brand: args.render.brand, template: args.render.template, meta: { type: args.type, acceptance: args.acceptance }, title: args.title });
  const { header, footer } = headerFooterTemplates(args.render.brand, args.render.template);
  return htmlToPdf(html, { header, footer, coverPage: args.render.template.cover !== "none" });
}

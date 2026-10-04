import { describe, expect, it, vi } from "vitest";
import { sampleProposal, ACME_BRAND } from "@/lib/documents/samples";
import { getSystemTemplate } from "@/lib/documents/templates";
import { DocumentRenderer } from "@/components/documents/document-renderer";

const props = { content: sampleProposal(), brand: ACME_BRAND, template: getSystemTemplate("proposal-bold")!.config, meta: { type: "proposal" as const } };

describe("StaticDocument", () => {
  it("falls back to the plain preview instead of throwing when the runtime renderer is missing", async () => {
    vi.resetModules();
    vi.doMock("@/lib/pdf/static-markup", () => ({ renderToStaticMarkup: () => { throw new Error("Cannot find module 'react-dom/server'"); } }));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { StaticDocument } = await import("@/components/marketing/static-document");
    const out = StaticDocument(props) as { type: unknown };
    expect((out.type as { name: string }).name).toBe(DocumentRenderer.name);
    expect(log).toHaveBeenCalled();
    log.mockRestore(); vi.doUnmock("@/lib/pdf/static-markup");
  });

  it("renders the sample to HTML with no heading elements when the renderer is available", async () => {
    vi.resetModules();
    vi.doMock("@/lib/pdf/static-markup", () => ({ renderToStaticMarkup: () => '<div class="doc"><h1>Title</h1><h2>Section</h2></div>' }));
    const { StaticDocument } = await import("@/components/marketing/static-document");
    const out = StaticDocument(props) as { props: { children: { props: { dangerouslySetInnerHTML: { __html: string } } }[] } };
    expect(out.props.children[0].props.dangerouslySetInnerHTML.__html).toBe('<div class="doc"><div data-h="1">Title</div><div data-h="2">Section</div></div>');
    vi.doUnmock("@/lib/pdf/static-markup");
  });
});

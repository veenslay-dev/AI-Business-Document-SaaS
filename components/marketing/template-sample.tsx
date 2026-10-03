import { DocumentRenderer } from "@/components/documents/document-renderer";
import { CroppedPreview } from "@/components/marketing/cropped-preview";
import { ACME_BRAND, sampleMarketingProposal, sampleProposal, sampleQuotation, sampleSocialAudit } from "@/lib/documents/samples";
import { getSystemTemplate, type TemplateConfig } from "@/lib/documents/templates";
import type { TemplateSlug } from "@/lib/seo/templates";

const cfg = (key: string, over: Partial<TemplateConfig> = {}): TemplateConfig => ({ ...getSystemTemplate(key)!.config, ...over });

const LABEL: Record<TemplateSlug, string> = {
  "seo-proposal": "Sample SEO proposal with summary, strategy, timeline and pricing",
  "website-quotation-gst": "Sample website quotation with scope of work, line items and GST",
  "social-media-audit": "Sample social media audit with scorecard and checklists",
  "digital-marketing-proposal": "Sample digital marketing proposal with channel plan and packages",
};

/** The real document renderer fed with fictional data, scaled down and cropped to `height` pixels of the document. */
export function TemplateSample({ slug, height }: { slug: TemplateSlug; height: number }) {
  const render = () => {
    switch (slug) {
      case "seo-proposal": return <DocumentRenderer content={sampleProposal()} brand={ACME_BRAND} template={cfg("proposal-bold")} meta={{ type: "proposal" }} />;
      case "website-quotation-gst": return <DocumentRenderer content={sampleQuotation()} brand={ACME_BRAND} template={cfg("quotation-executive")} meta={{ type: "quotation" }} />;
      case "social-media-audit": return <DocumentRenderer content={sampleSocialAudit()} brand={ACME_BRAND} template={cfg("social-audit-scorecard", { cover: "none", headerStyle: "studio" })} meta={{ type: "social_audit" }} />;
      case "digital-marketing-proposal": return <DocumentRenderer content={sampleMarketingProposal()} brand={ACME_BRAND} template={cfg("proposal-elegant")} meta={{ type: "proposal" }} />;
    }
  };
  return <CroppedPreview label={LABEL[slug]} height={height}>{render()}</CroppedPreview>;
}

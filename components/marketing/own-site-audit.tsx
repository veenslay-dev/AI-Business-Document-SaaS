import { CroppedPreview } from "@/components/marketing/cropped-preview";
import { StaticDocument } from "@/components/marketing/static-document";
import { getSampleAudit } from "@/lib/audit/sample";
import { ownSiteAudit, priodraftBrand } from "@/lib/documents/samples";
import { getSystemTemplate } from "@/lib/documents/templates";
import { siteUrl } from "@/lib/utils";

/** The real audit of our own site, as a report preview. Renders nothing until an admin has run the audit once. */
export async function OwnSiteAudit({ height }: { height: number }) {
  const sample = await getSampleAudit();
  if (!sample) return null;
  const brand = priodraftBrand(siteUrl(), process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null);
  const content = ownSiteAudit(sample.signals, sample.scannedAt, sample.url, brand);
  const template = { ...getSystemTemplate("audit-seo-professional")!.config, cover: "none" as const };
  const host = sample.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <CroppedPreview label={`SEO audit report for ${host}: health score by category and the findings`} height={height}>
      <StaticDocument content={content} brand={brand} template={template} meta={{ type: "seo_audit" }} />
    </CroppedPreview>
  );
}

export async function sampleAuditInfo(): Promise<{ host: string; date: string } | null> {
  const sample = await getSampleAudit();
  if (!sample) return null;
  return { host: sample.url.replace(/^https?:\/\//, "").replace(/\/$/, ""), date: new Date(sample.scannedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) };
}

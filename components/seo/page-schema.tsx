import { getOverride } from "@/lib/seo/pages";
import { buildPageSchema, serializeJsonLd } from "@/lib/seo/schema";
import { operator } from "@/lib/legal";
import { siteUrl } from "@/lib/utils";

/** Drops the page's structured data into the HTML. Built on every request from the live content and the admin's settings. */
export async function PageSchema({ path }: { path: string }) {
  const o = await getOverride(path);
  const op = operator();
  const data = buildPageSchema(path, o, siteUrl(), { contactEmail: op.email || undefined, legalName: op.name });
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { PageForm } from "@/components/admin/page-form";
import { getOverride, isIndexable } from "@/lib/seo/pages";
import { PAGE_BY_PATH } from "@/lib/seo/registry";
import { buildPageSchema } from "@/lib/seo/schema";
import { operator } from "@/lib/legal";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditPage({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  const path = (await searchParams).path ?? "";
  const def = PAGE_BY_PATH[path];
  if (!def) notFound();
  const o = await getOverride(path);
  const op = operator();
  const generated = buildPageSchema(path, o, siteUrl(), { contactEmail: op.email || undefined, legalName: op.name });
  return (
    <div className="space-y-5">
      <div>
        <Link href="/admin/pages" className="text-sm font-semibold text-brand hover:underline">All pages</Link>
        <h2 className="mt-1 text-xl font-bold">{def.name} <span className="text-sm font-normal text-ink-faint">{def.path}</span></h2>
      </div>
      <PageForm
        def={{ path: def.path, name: def.name, title: def.title, absoluteTitle: !!def.absoluteTitle, description: def.description, heading: def.heading ?? "", intro: def.intro ?? "", content: def.content, noindex: !!def.noindex }}
        initial={{ seoTitle: o?.seo_title ?? "", seoDescription: o?.seo_description ?? "", canonical: o?.canonical ?? "", ogImage: o?.og_image ?? "", robots: o?.robots ?? "default", heading: o?.heading ?? "", intro: o?.intro ?? "", extraMd: o?.extra_md ?? "", schemaJson: o?.schema_json ?? "" }}
        indexable={isIndexable(path, o)} customised={!!o} siteBase={siteUrl()} generatedSchema={JSON.stringify(generated, null, 2)}
      />
    </div>
  );
}

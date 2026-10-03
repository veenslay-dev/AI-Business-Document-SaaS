import { notFound } from "next/navigation";
import { TemplateDetail } from "@/components/marketing/template-page";
import { pageMetadata } from "@/lib/seo/pages";
import { TEMPLATE_BY_SLUG } from "@/lib/seo/templates";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const tpl = TEMPLATE_BY_SLUG((await params).slug);
  return tpl ? pageMetadata(tpl.path) : {};
}

export default async function TemplatePage({ params }: { params: Promise<{ slug: string }> }) {
  const tpl = TEMPLATE_BY_SLUG((await params).slug);
  if (!tpl) notFound();
  return <TemplateDetail tpl={tpl} />;
}

import { TemplateHub } from "@/components/marketing/template-page";
import { pageMetadata } from "@/lib/seo/pages";
import { TEMPLATE_HUB } from "@/lib/seo/templates";

export const generateMetadata = () => pageMetadata(TEMPLATE_HUB.path);
export default function DocumentTemplatesPage() { return <TemplateHub />; }

import { PlanGrid } from "@/components/marketing/plan-grid";
import { PageSchema } from "@/components/seo/page-schema";
import { getUser } from "@/lib/auth/session";
import { Markdown } from "@/lib/seo/markdown";
import { getPageContent, pageMetadata } from "@/lib/seo/pages";
import { PAGE_BY_PATH } from "@/lib/seo/registry";

export const generateMetadata = () => pageMetadata("/pricing");

export default async function PricingPage() {
  const signedIn = !!(await getUser());
  const c = await getPageContent("/pricing");
  const def = PAGE_BY_PATH["/pricing"];
  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <PageSchema path="/pricing" />
      <h1 className="text-4xl font-extrabold">{c.heading ?? def.heading}</h1>
      <p className="mb-8 mt-3 max-w-2xl text-ink-soft">{c.intro ?? def.intro}</p>
      <PlanGrid signedIn={signedIn} />
      {c.extraMd && <div className="mt-12 max-w-3xl text-ink-soft"><Markdown md={c.extraMd} /></div>}
    </main>
  );
}

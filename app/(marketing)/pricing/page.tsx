import Link from "next/link";
import { FaqSection } from "@/components/marketing/faq-section";
import { PlanGrid } from "@/components/marketing/plan-grid";
import { PlanTable } from "@/components/marketing/plan-table";
import { PageSchema } from "@/components/seo/page-schema";
import { getUser } from "@/lib/auth/session";
import { PAGE_FAQ } from "@/lib/content/faq";
import { FACTS } from "@/lib/content/facts";
import { Markdown } from "@/lib/seo/markdown";
import { getPageContent, pageMetadata } from "@/lib/seo/pages";
import { PAGE_BY_PATH } from "@/lib/seo/registry";

export const generateMetadata = () => pageMetadata("/pricing");

export default async function PricingPage() {
  const signedIn = !!(await getUser());
  const c = await getPageContent("/pricing");
  const def = PAGE_BY_PATH["/pricing"];
  return (
    <main>
      <PageSchema path="/pricing" />
      <section className="mx-auto max-w-7xl px-5 pb-6 pt-12">
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight">{c.heading ?? def.heading}</h1>
        <p className="mb-8 mt-3 max-w-3xl text-lg text-ink-soft">{c.intro ?? def.intro}</p>
        <PlanGrid signedIn={signedIn} />
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12" aria-labelledby="compare">
        <h2 id="compare" className="text-2xl font-extrabold">Compare the plans</h2>
        <p className="mb-5 mt-2 max-w-3xl text-ink-soft">Every plan includes proposals, quotations, invoices, SEO audits, social media audits, PDF export, share links with view tracking and your brand kit. The plans differ in volume, team size and premium report templates.</p>
        <PlanTable />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8" aria-labelledby="billing">
        <h2 id="billing" className="text-2xl font-extrabold">How billing works</h2>
        <ul className="mt-4 grid max-w-4xl gap-3 text-ink-soft sm:grid-cols-2">
          <li className="rounded-xl border border-line bg-surface p-4">Plans are charged in Indian rupees. The price you see at checkout is the price you pay.</li>
          <li className="rounded-xl border border-line bg-surface p-4">You pay online with Razorpay using UPI, cards or net banking, depending on what your bank supports.</li>
          <li className="rounded-xl border border-line bg-surface p-4">A paid plan lasts one month or one year and never renews on its own. When it ends you return to the Free plan's limits and keep your documents.</li>
          <li className="rounded-xl border border-line bg-surface p-4">Refunds are available within {FACTS.refundDays} days of your first payment. Read the <Link href="/refund-policy" className="font-medium text-brand hover:underline">Refund Policy</Link> and the <Link href="/terms" className="font-medium text-brand hover:underline">Terms of Service</Link> for the full conditions.</li>
        </ul>
      </section>

      {c.extraMd && <section className="mx-auto max-w-3xl px-5 py-8 text-ink-soft"><Markdown md={c.extraMd} /></section>}
      <FaqSection items={PAGE_FAQ["/pricing"]} title="Pricing questions" />
    </main>
  );
}

import type { Metadata } from "next";
import { PlanGrid } from "@/components/marketing/plan-grid";
import { PRODUCT_NAME } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Pricing",
  description: `${PRODUCT_NAME} plans: a free plan with 10 documents and 3 AI actions a month, Pro and Agency plans with more documents, AI and team members, and a custom plan.`,
  alternates: { canonical: "/pricing" },
  openGraph: { title: `Pricing | ${PRODUCT_NAME}`, url: "/pricing" },
};

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-12">
      <h1 className="text-4xl font-extrabold">Simple, fair pricing</h1>
      <p className="mb-8 mt-3 max-w-2xl text-ink-soft">Start free with 10 documents and 3 AI actions a month. Upgrade when you need more documents, more AI and more people. Need something bigger? Ask for a custom plan.</p>
      <PlanGrid />
    </main>
  );
}

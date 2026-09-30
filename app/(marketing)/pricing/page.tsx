import type { Metadata } from "next";
import { PlanGrid } from "@/components/marketing/plan-grid";
import { PRODUCT_NAME } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Pricing",
  description: `${PRODUCT_NAME} plans: a free plan with 3 documents a month, and Professional and Agency plans for unlimited documents, AI, tracking and teams.`,
  alternates: { canonical: "/pricing" },
  openGraph: { title: `Pricing | ${PRODUCT_NAME}`, url: "/pricing" },
};

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="font-serif text-4xl">Pricing</h1>
      <p className="mb-10 mt-3 max-w-xl text-ink-soft">Start free. Professional and Agency aren't open for purchase yet, and their prices will be published here before they are. Online payments can be connected later without changing how your workspace works.</p>
      <PlanGrid />
    </main>
  );
}

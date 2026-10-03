import type { Metadata } from "next";
import { NOINDEX_META } from "@/lib/seo/robots";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/ui/logo";
import { createFirstWorkspace } from "@/lib/auth/bootstrap";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { getActiveMembership, getMemberships, getUser } from "@/lib/auth/session";
import { getWorkspaceBranding } from "@/lib/db/workspace";
import { FIRST_DOCUMENT_HREF } from "@/lib/onboarding";

export const metadata: Metadata = { title: "Set up your workspace", robots: NOINDEX_META };
export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/login");

  // First visit after signup: create the workspace from the company name given at signup.
  if ((await getMemberships()).length === 0) {
    if ((await searchParams).error === "workspace" || !(await createFirstWorkspace())) {
      return (
        <main className="grid min-h-dvh place-items-center p-6 text-center">
          <div>
            <h1 className="font-serif text-2xl">We couldn't create your workspace</h1>
            <p className="mt-2 text-sm text-ink-soft">Something went wrong on our side. Please try again.</p>
            <a href="/onboarding" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">Try again</a>
          </div>
        </main>
      );
    }
    redirect("/onboarding"); // re-render with the new membership
  }

  const membership = await getActiveMembership();
  if (!membership) redirect("/login");
  if (membership.onboardingCompleted) redirect("/dashboard");

  const data = await getWorkspaceBranding(membership.workspaceId);
  if (!data) redirect("/login");
  const { company: c, brand: b } = data;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface px-4 py-3 sm:px-6"><Wordmark /></header>
      <OnboardingWizard
        firstDocumentHref={FIRST_DOCUMENT_HREF}
        company={{
          companyName: c.company_name, tagline: c.tagline ?? "", website: c.website ?? "", email: c.email ?? user.email ?? "",
          phone: c.phone ?? "", address: c.address ?? "", gstNumber: c.gst_number ?? "", panNumber: c.pan_number ?? "",
          description: c.description ?? "",
        }}
        brand={{
          primaryColor: b.primary_color, secondaryColor: b.secondary_color, accentColor: b.accent_color,
          headerColor: b.header_color ?? null, headingColor: b.heading_color ?? null, headingFont: b.heading_font as never, bodyFont: b.body_font as never, defaultFooter: b.default_footer ?? "",
          logoUrl: b.logo_url, darkLogoUrl: b.dark_logo_url,
        }}
        business={{
          services: Array.isArray(c.services) ? (c.services as string[]).join("\n") : "",
          defaultTerms: c.default_terms ?? "", authorizedName: c.authorized_name ?? "",
          authorizedDesignation: c.authorized_designation ?? "", signatureUrl: c.signature_url,
        }}
      />
    </div>
  );
}

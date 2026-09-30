import type { Metadata } from "next";
import { BrandKitForm } from "@/components/branding/brand-kit-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { FormMessage } from "@/components/ui/field";
import { requireWorkspace } from "@/lib/auth/session";
import { getWorkspaceBranding } from "@/lib/db/workspace";
import { can } from "@/lib/permissions/roles";

export const metadata: Metadata = { title: "Brand Kit" };

export default async function BrandKitPage() {
  const { membership } = await requireWorkspace();
  const data = await getWorkspaceBranding(membership.workspaceId);
  if (!data) return <FormMessage kind="error">We couldn’t load your brand kit. Refresh to try again.</FormMessage>;
  const { company: c, brand: b } = data;
  const readOnly = !can(membership.role, "brand:update");

  return (
    <>
      <PageHeader
        title="Brand Kit"
        description="Set this once. Every new proposal, quotation and audit uses it automatically. Documents you’ve already sent keep the look they had."
      />
      {readOnly && <div className="mb-6"><FormMessage kind="info">Only owners and admins can edit the brand kit.</FormMessage></div>}
      <BrandKitForm
        readOnly={readOnly}
        company={{ companyName: c.company_name, tagline: c.tagline, email: c.email, phone: c.phone, website: c.website }}
        defaults={{
          primaryColor: b.primary_color, secondaryColor: b.secondary_color, accentColor: b.accent_color,
          headingFont: b.heading_font as never, bodyFont: b.body_font as never, defaultFooter: b.default_footer ?? "",
          logoUrl: b.logo_url, darkLogoUrl: b.dark_logo_url,
        }}
      />
    </>
  );
}

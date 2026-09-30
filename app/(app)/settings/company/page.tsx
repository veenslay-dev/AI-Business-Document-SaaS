import type { Metadata } from "next";
import { BusinessInfoForm } from "@/components/branding/business-info-form";
import { CompanyInfoForm } from "@/components/branding/company-info-form";
import { requireWorkspace } from "@/lib/auth/session";
import { getWorkspaceBranding } from "@/lib/db/workspace";
import { can } from "@/lib/permissions/roles";
import { FormMessage } from "@/components/ui/field";

export const metadata: Metadata = { title: "Company settings" };

export default async function CompanySettingsPage() {
  const { membership } = await requireWorkspace();
  const data = await getWorkspaceBranding(membership.workspaceId);
  if (!data) return <FormMessage kind="error">We couldn’t load your company details. Refresh to try again.</FormMessage>;
  const { company: c } = data;
  const readOnly = !can(membership.role, "company:update");

  return (
    <div className="max-w-2xl space-y-12">
      {readOnly && <FormMessage kind="info">Only owners and admins can edit company details.</FormMessage>}
      <section>
        <h2 className="mb-1 text-lg font-semibold">Company profile</h2>
        <p className="mb-5 text-sm text-ink-soft">New documents pick up changes right away. Documents you have already sent keep the details they were sent with.</p>
        <CompanyInfoForm readOnly={readOnly} defaults={{
          companyName: c.company_name, tagline: c.tagline ?? "", website: c.website ?? "", email: c.email ?? "",
          phone: c.phone ?? "", address: c.address ?? "", gstNumber: c.gst_number ?? "", panNumber: c.pan_number ?? "",
          description: c.description ?? "",
        }} />
      </section>
      <section>
        <h2 className="mb-5 text-lg font-semibold">Services, terms and signatory</h2>
        <BusinessInfoForm readOnly={readOnly} defaults={{
          services: Array.isArray(c.services) ? (c.services as string[]).join("\n") : "",
          defaultTerms: c.default_terms ?? "", authorizedName: c.authorized_name ?? "",
          authorizedDesignation: c.authorized_designation ?? "", signatureUrl: c.signature_url,
        }} />
      </section>
    </div>
  );
}

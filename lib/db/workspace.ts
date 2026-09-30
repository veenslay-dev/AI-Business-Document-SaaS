import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { buildBrandContext, type BrandContext, type BrandKitRow, type CompanyProfileRow } from "@/lib/documents/branding";

const COMPANY_COLUMNS =
  "company_name, tagline, description, website, email, phone, address, gst_number, pan_number, services, default_terms, authorized_name, authorized_designation, signature_url";
const BRAND_COLUMNS =
  "primary_color, secondary_color, accent_color, heading_font, body_font, logo_url, dark_logo_url, favicon_url, default_footer";

/** Both queries are scoped by workspace_id AND protected by RLS. */
export const getWorkspaceBranding = cache(async (workspaceId: string) => {
  const supabase = await createClient();
  const [company, brand] = await Promise.all([
    supabase.from("company_profiles").select(COMPANY_COLUMNS).eq("workspace_id", workspaceId).maybeSingle(),
    supabase.from("brand_kits").select(BRAND_COLUMNS).eq("workspace_id", workspaceId).maybeSingle(),
  ]);
  if (!company.data || !brand.data) return null;
  const companyRow = company.data as CompanyProfileRow;
  const brandRow = brand.data as BrandKitRow;
  return { company: companyRow, brand: brandRow, context: buildBrandContext(companyRow, brandRow) as BrandContext };
});

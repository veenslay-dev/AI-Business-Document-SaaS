import { fontStack } from "./fonts";

/** Raw rows as stored in the database. */
export type CompanyProfileRow = {
  company_name: string; tagline: string | null; description: string | null; website: string | null;
  email: string | null; phone: string | null; address: string | null; gst_number: string | null;
  pan_number: string | null; services: unknown; default_terms: string | null;
  authorized_name: string | null; authorized_designation: string | null; signature_url: string | null;
};
export type BrandKitRow = {
  primary_color: string; secondary_color: string; accent_color: string; heading_font: string;
  body_font: string; logo_url: string | null; dark_logo_url: string | null; favicon_url: string | null;
  default_footer: string | null;
};

/**
 * Everything a document renderer needs to look like the company made it.
 * Built from Company Profile + Brand Kit. It is also what gets frozen into
 * documents.brand_snapshot when a document is sent, so history never changes.
 */
export type BrandContext = {
  company: {
    name: string; tagline: string | null; description: string | null; website: string | null;
    email: string | null; phone: string | null; address: string | null; gst: string | null; pan: string | null;
    services: string[]; terms: string | null;
    signatory: { name: string | null; designation: string | null; signatureUrl: string | null };
  };
  brand: {
    primary: string; secondary: string; accent: string;
    headingFont: string; bodyFont: string;
    headingStack: string; bodyStack: string;
    logoUrl: string | null; darkLogoUrl: string | null; faviconUrl: string | null;
    footer: string | null;
  };
};

export function buildBrandContext(company: CompanyProfileRow, brand: BrandKitRow): BrandContext {
  const services = Array.isArray(company.services) ? company.services.filter((s): s is string => typeof s === "string") : [];
  return {
    company: {
      name: company.company_name, tagline: company.tagline, description: company.description,
      website: company.website, email: company.email, phone: company.phone, address: company.address,
      gst: company.gst_number, pan: company.pan_number, services, terms: company.default_terms,
      signatory: {
        name: company.authorized_name, designation: company.authorized_designation, signatureUrl: company.signature_url,
      },
    },
    brand: {
      primary: brand.primary_color, secondary: brand.secondary_color, accent: brand.accent_color,
      headingFont: brand.heading_font, bodyFont: brand.body_font,
      headingStack: fontStack(brand.heading_font), bodyStack: fontStack(brand.body_font),
      logoUrl: brand.logo_url, darkLogoUrl: brand.dark_logo_url, faviconUrl: brand.favicon_url,
      footer: brand.default_footer,
    },
  };
}

/** Black or white, whichever reads better on the given background. */
export function readableOn(hex: string): "#ffffff" | "#111111" {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "#111111" : "#ffffff";
}

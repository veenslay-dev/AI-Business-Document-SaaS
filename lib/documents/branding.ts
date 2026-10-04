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
  /** Optional. Background for the cover band, table headers and total bars. Null derives it from the primary color. */
  header_color?: string | null;
  /** Optional. Color of headings on white paper. Null derives a readable version of the primary color. */
  heading_color?: string | null;
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
    /** Background of cover bands, table headers and total bars. */
    header: string;
    /** Heading text color on white paper, always readable. */
    headingText: string;
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
      header: brand.header_color ?? brand.primary_color,
      headingText: ensureReadableOnWhite(brand.heading_color ?? brand.primary_color),
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

function channels(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const toHex = (c: [number, number, number]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/**
 * Returns the color itself when it reads well on white, otherwise the closest darker shade that does.
 * Keeps the hue, so a bright cyan brand color becomes a deep teal for headings instead of unreadable text.
 */
export function ensureReadableOnWhite(hex: string, minRatio = 4.5): string {
  if (contrastRatio(hex, "#ffffff") >= minRatio) return hex.toLowerCase();
  const base = channels(hex);
  for (let step = 1; step <= 20; step++) {
    const k = 1 - step * 0.05;
    const c = toHex([base[0] * k, base[1] * k, base[2] * k]);
    if (contrastRatio(c, "#ffffff") >= minRatio) return c;
  }
  return "#111111";
}

/** Mixes a color with white. `share` is how much of the original color stays (0 to 1). */
function mixWithWhite(hex: string, share: number): string {
  const c = channels(hex);
  return toHex([c[0] * share + 255 * (1 - share), c[1] * share + 255 * (1 - share), c[2] * share + 255 * (1 - share)]);
}

/**
 * A soft tint of the secondary color for backgrounds (striped rows, callouts, section bars).
 * A light secondary keeps most of its color; a dark one, such as black, is diluted so backgrounds stay light.
 */
export function softTint(secondary: string): string {
  return mixWithWhite(secondary, relativeLuminance(secondary) > 0.6 ? 0.55 : 0.1);
}

/** Blends `a` with `b`. `share` is how much of `a` is kept (0 to 1). */
export function mixColors(a: string, b: string, share: number): string {
  const x = channels(a), y = channels(b);
  return toHex([x[0] * share + y[0] * (1 - share), x[1] * share + y[1] * (1 - share), x[2] * share + y[2] * (1 - share)]);
}

/**
 * Makes `hex` readable on `bg`: darkens it on light backgrounds and lightens it on dark ones,
 * keeping the hue, until the WCAG contrast ratio reaches `minRatio`.
 */
export function ensureReadableOn(hex: string, bg: string, minRatio = 4.5): string {
  if (contrastRatio(hex, bg) >= minRatio) return hex.toLowerCase();
  const towards = relativeLuminance(bg) < 0.4 ? "#ffffff" : "#000000";
  for (let step = 1; step <= 20; step++) {
    const c = mixColors(towards, hex, step * 0.05);
    if (contrastRatio(c, bg) >= minRatio) return c;
  }
  return towards;
}

export type PageTheme = { paper: string; card: string; ink: string; muted: string; line: string; tint: string; dark: boolean };

/** Text, card and line colors that stay readable on whatever page background the user picks. */
export function pageTheme(bg: string, secondary: string): PageTheme {
  const dark = relativeLuminance(bg) < 0.4;
  if (dark) {
    return { paper: bg, card: mixColors("#ffffff", bg, 0.08), ink: "#f3f4f6", muted: "#b8bfcc", line: mixColors("#ffffff", bg, 0.2), tint: mixColors("#ffffff", bg, 0.07), dark };
  }
  return { paper: bg, card: "#ffffff", ink: "#1b1d22", muted: "#5b616d", line: "#dcdfe5", tint: softTint(secondary), dark };
}

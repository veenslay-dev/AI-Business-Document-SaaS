import { z } from "zod";
import { ensureReadableOnWhite, type BrandContext } from "./branding";
import { fontStack, ALL_FONTS } from "./fonts";
import { isHexColor } from "./util";

const s = z.string().nullable();
const hex = z.string().refine(isHexColor);
const font = z.string().refine((f) => ALL_FONTS.includes(f));

export const brandContextSchema = z.object({
  company: z.object({
    name: z.string(), tagline: s, description: s, website: s, email: s, phone: s, address: s, gst: s, pan: s,
    services: z.array(z.string()), terms: s,
    signatory: z.object({ name: s, designation: s, signatureUrl: s }),
  }),
  brand: z.object({
    primary: hex, secondary: hex, accent: hex, header: hex.optional(), headingText: hex.optional(), headingFont: font, bodyFont: font, headingStack: z.string(), bodyStack: z.string(),
    logoUrl: s, darkLogoUrl: s, faviconUrl: s, footer: s,
  }),
});

/**
 * Reads a stored brand snapshot. Anything that doesn't validate is rejected, and
 * the font stacks are always recomputed from the whitelist rather than trusted.
 */
export function parseSnapshot(raw: unknown): BrandContext | null {
  const r = brandContextSchema.safeParse(raw);
  if (!r.success) return null;
  const v = r.data;
  // Snapshots saved before header colors existed derive them from the primary color, as they always looked.
  return { company: v.company, brand: { ...v.brand, header: v.brand.header ?? v.brand.primary, headingText: ensureReadableOnWhite(v.brand.headingText ?? v.brand.primary), headingStack: fontStack(v.brand.headingFont), bodyStack: fontStack(v.brand.bodyFont) } };
}

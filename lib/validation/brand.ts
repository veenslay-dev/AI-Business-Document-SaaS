import { z } from "zod";
import { BODY_FONTS, HEADING_FONTS } from "@/lib/documents/fonts";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6 digit hex color like #1f3a5f");

export const brandKitSchema = z.object({
  primaryColor: hex,
  secondaryColor: hex,
  accentColor: hex,
  // null means automatic (derived from the primary color)
  headerColor: z.union([hex, z.null()]).optional().transform((v) => v ?? null),
  headingColor: z.union([hex, z.null()]).optional().transform((v) => v ?? null),
  headingFont: z.enum(HEADING_FONTS),
  bodyFont: z.enum(BODY_FONTS),
  defaultFooter: z.string().trim().max(300).optional().transform((v) => (v ? v : null)),
});

export type BrandKitInput = z.input<typeof brandKitSchema>;
export type BrandKitOutput = z.output<typeof brandKitSchema>;

export const ASSET_KINDS = ["logo", "dark_logo", "favicon", "signature", "doc_image"] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const MAX_ASSET_BYTES = 2 * 1024 * 1024;
export const ALLOWED_ASSET_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"] as const;

import type { Block } from "./content";

/** Only http(s) URLs and inline PNG/JPEG data URLs may be rendered as images. */
export function safeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(u) && u.length < 400_000) return u;
  return null;
}

export const isHexColor = (c: string) => /^#[0-9a-fA-F]{6}$/.test(c);

type PricingBlock = Extract<Block, { type: "pricing" }>;

/** Total of the pricing rows plus the selected package (if any). */
export function pricingTotal(b: PricingBlock): number {
  const rows = b.rows.reduce((s, r) => s + (Number.isFinite(r.amount) ? r.amount : 0), 0);
  const pkg = b.packages.find((p) => p.selected);
  return Math.round((rows + (pkg?.price ?? 0)) * 100) / 100;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, passed: 4 } as const;

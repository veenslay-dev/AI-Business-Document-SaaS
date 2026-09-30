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

import type { Section } from "./content";

/** True when a section has nothing a reader would see. Such sections are left out of the rendered document (the editor still shows them). */
export function isSectionEmpty(section: Section): boolean {
  return section.blocks.every((b) => {
    switch (b.type) {
      case "paragraph": case "callout": return b.content.trim() === "";
      case "heading": return true; // a heading alone says nothing
      case "list": return b.items.every((i) => i.trim() === "");
      case "table": return b.rows.every((r) => r.every((c) => c.trim() === ""));
      case "image": return safeImageUrl(b.url) === null;
      case "pricing": return b.rows.length === 0 && b.packages.length === 0;
      case "timeline": return b.items.every((i) => !i.phase.trim() && !i.description.trim());
      case "page_break": return false;
      default: return false; // signature, quotation and audit blocks always render
    }
  });
}

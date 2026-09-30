import { z } from "zod";

/**
 * Structured document content. The same JSON drives the editor preview, the
 * public page, the PDF and (later) email and mobile. No HTML is stored.
 */

export const CURRENCIES = ["INR", "USD", "GBP", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

const id = z.string().min(1).max(40);
const text = (max = 4000) => z.string().max(max);

export const quotationItemSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("item"),
    id,
    name: text(200),
    description: text(1000).default(""),
    quantity: z.number().min(0).max(1_000_000),
    unit: text(30).default(""),
    unitPrice: z.number().min(0).max(1_000_000_000),
    /** Discount on this line, as a percentage or a fixed amount. */
    discountType: z.enum(["percent", "fixed"]).default("percent"),
    discount: z.number().min(0).default(0),
    /** Overrides the document tax rate for this line when set. */
    taxRate: z.number().min(0).max(100).nullable().default(null),
  }),
  z.object({ kind: z.literal("section"), id, title: text(200) }),
]);
export type QuotationItem = z.infer<typeof quotationItemSchema>;

export const quotationDataSchema = z.object({
  number: text(40),
  issueDate: text(20),
  validUntil: text(20).default(""),
  /** Label for the date above: "Valid until" on quotations, "Due date" on invoices. */
  dueLabel: text(30).optional(),
  currency: z.enum(CURRENCIES).default("INR"),
  /** Configurable tax: label ("GST", "VAT", "Sales tax") and default rate. */
  taxLabel: text(30).default("GST"),
  taxRate: z.number().min(0).max(100).default(18),
  taxInclusive: z.boolean().default(false),
  /** Extra discount on the whole quotation. */
  discountType: z.enum(["percent", "fixed"]).default("percent"),
  discount: z.number().min(0).default(0),
  items: z.array(quotationItemSchema).max(200),
});
export type QuotationData = z.infer<typeof quotationDataSchema>;

const pricingRowSchema = z.object({ id, name: text(200), description: text(600).default(""), amount: z.number().min(0) });
const packageSchema = z.object({
  id, name: text(80), price: z.number().min(0), description: text(400).default(""), features: z.array(text(200)).max(20),
  selected: z.boolean().default(false),
});

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ id, type: z.literal("heading"), level: z.union([z.literal(2), z.literal(3)]).default(3), content: text(200) }),
  z.object({ id, type: z.literal("paragraph"), content: text() }),
  z.object({ id, type: z.literal("list"), style: z.enum(["bullet", "number"]).default("bullet"), items: z.array(text(600)).max(60) }),
  z.object({ id, type: z.literal("callout"), content: text(1200) }),
  z.object({ id, type: z.literal("table"), headers: z.array(text(100)).max(8), rows: z.array(z.array(text(400)).max(8)).max(100) }),
  z.object({ id, type: z.literal("image"), url: text(1000), alt: text(200).default(""), caption: text(200).default("") }),
  z.object({
    id, type: z.literal("pricing"), currency: z.enum(CURRENCIES).default("INR"),
    rows: z.array(pricingRowSchema).max(40), note: text(600).default(""),
    packages: z.array(packageSchema).max(4).default([]),
  }),
  z.object({
    id, type: z.literal("timeline"),
    items: z.array(z.object({ id, phase: text(120), duration: text(60).default(""), description: text(800).default("") })).max(30),
  }),
  z.object({ id, type: z.literal("signature"), label: text(100).default("Authorized signatory") }),
  z.object({ id, type: z.literal("page_break") }),
  z.object({ id, type: z.literal("quotation"), data: quotationDataSchema }),
  z.object({
    id, type: z.literal("audit_summary"),
    scores: z.array(z.object({ category: text(60), score: z.number().min(0).max(100) })).max(10),
    overall: z.number().min(0).max(100),
    intro: text(1500).default(""),
  }),
  z.object({
    id, type: z.literal("checklist"),
    /** Optional overall observation for the section, written by the auditor. */
    summary: text(2000).default(""),
    items: z.array(z.object({
      id,
      item: text(300),
      status: z.enum(["unchecked", "good", "needs_work", "poor", "na"]).default("unchecked"),
      priority: z.enum(["", "high", "medium", "low"]).default(""),
      note: text(1500).default(""),
      recommendation: text(1500).default(""),
      /** Optional evidence image (URL). Shown under the row only when present. */
      screenshot: text(1000).optional(),
    })).max(80),
  }),
  z.object({ id, type: z.literal("gallery"), columns: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2), items: z.array(z.object({ id, url: text(1000), caption: text(300).default("") })).max(24) }),
  z.object({ id, type: z.literal("scorecard"), intro: text(1500).default("") }),
  z.object({
    id, type: z.literal("audit_findings"),
    category: text(60),
    findings: z.array(z.object({
      id,
      issue: text(200),
      severity: z.enum(["critical", "high", "medium", "low", "passed"]),
      explanation: text(1500),
      recommendation: text(1500),
      affectedUrl: text(500).default(""),
      status: z.enum(["open", "fixed", "ignored", "passed"]).default("open"),
      screenshot: text(1000).optional(),
    })).max(80),
  }),
]);
export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block["type"];

export const sectionSchema = z.object({
  id,
  title: text(160),
  /** Hide the section title (used by sections that are a single self-titled block). */
  hideTitle: z.boolean().default(false),
  pageBreakBefore: z.boolean().default(false),
  blocks: z.array(blockSchema).max(80),
});
export type Section = z.infer<typeof sectionSchema>;

export const coverSchema = z.object({
  kicker: text(60).default(""),
  title: text(200),
  subtitle: text(300).default(""),
  preparedFor: text(200).default(""),
  preparedBy: text(200).default(""),
  date: text(30).default(""),
  reference: text(60).default(""),
});
export type Cover = z.infer<typeof coverSchema>;

export const documentContentSchema = z.object({
  version: z.literal(1).default(1),
  cover: coverSchema,
  sections: z.array(sectionSchema).max(60),
  /** Client details shown on the document (copied when created, editable). */
  client: z.object({
    company: text(200).default(""), contact: text(200).default(""), email: text(200).default(""),
    phone: text(60).default(""), address: text(400).default(""),
  }).default({ company: "", contact: "", email: "", phone: "", address: "" }),
  /** Whole-document look chosen by the user. Optional. */
  style: z.object({ background: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional() }).optional(),
  /** Audit-only metadata. */
  audit: z.object({ url: text(500), scannedAt: text(40) }).optional(),
});
export type DocumentContent = z.infer<typeof documentContentSchema>;

let counter = 0;
/** Short unique id for sections and blocks. */
export function newId(prefix = "b"): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export function emptyBlock(type: BlockType): Block {
  const base = { id: newId() };
  switch (type) {
    case "heading": return { ...base, type, level: 3, content: "New heading" };
    case "paragraph": return { ...base, type, content: "" };
    case "list": return { ...base, type, style: "bullet", items: [""] };
    case "callout": return { ...base, type, content: "" };
    case "table": return { ...base, type, headers: ["Item", "Details"], rows: [["", ""]] };
    case "image": return { ...base, type, url: "", alt: "", caption: "" };
    case "pricing": return { ...base, type, currency: "INR", rows: [{ id: newId(), name: "", description: "", amount: 0 }], note: "", packages: [] };
    case "timeline": return { ...base, type, items: [{ id: newId(), phase: "", duration: "", description: "" }] };
    case "signature": return { ...base, type, label: "Authorized signatory" };
    case "page_break": return { ...base, type };
    case "quotation":
      return { ...base, type, data: { number: "", issueDate: "", validUntil: "", currency: "INR", taxLabel: "GST", taxRate: 18, taxInclusive: false, discountType: "percent", discount: 0, items: [] } };
    case "audit_summary": return { ...base, type, scores: [], overall: 0, intro: "" };
    case "audit_findings": return { ...base, type, category: "Findings", findings: [] };
    case "checklist": return { ...base, type, summary: "", items: [{ id: newId(), item: "", status: "unchecked", priority: "", note: "", recommendation: "", screenshot: "" }] };
    case "gallery": return { ...base, type, columns: 2, items: [] };
    case "scorecard": return { ...base, type, intro: "" };
  }
}

export function emptySection(title = "New section"): Section {
  return { id: newId("s"), title, hideTitle: false, pageBreakBefore: false, blocks: [{ id: newId(), type: "paragraph", content: "" }] };
}

/** Parses stored JSON. Returns null when it doesn't match the schema. */
export function parseContent(raw: unknown): DocumentContent | null {
  const r = documentContentSchema.safeParse(raw);
  return r.success ? r.data : null;
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  heading: "Heading", paragraph: "Paragraph", list: "List", callout: "Callout", table: "Table", image: "Image",
  pricing: "Pricing table", timeline: "Timeline", signature: "Signature", page_break: "Page break",
  quotation: "Line items", audit_summary: "Audit summary", audit_findings: "Findings", checklist: "Checklist", scorecard: "Scorecard", gallery: "Screenshots",
};

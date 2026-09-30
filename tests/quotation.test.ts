import { describe, expect, it } from "vitest";
import { calculateQuotation, formatMoney } from "@/lib/documents/quotation";
import type { QuotationData } from "@/lib/documents/content";
import { formatQuotationNumber } from "@/lib/documents/builders";
import { pricingTotal } from "@/lib/documents/util";

const item = (id: string, over: Partial<Extract<QuotationData["items"][number], { kind: "item" }>> = {}) => ({
  kind: "item" as const, id, name: id, description: "", quantity: 1, unit: "", unitPrice: 1000, discountType: "percent" as const, discount: 0, taxRate: null, ...over,
});
const base = (over: Partial<QuotationData> = {}): QuotationData => ({
  number: "QT-1", issueDate: "2026-01-01", validUntil: "", currency: "INR", taxLabel: "GST", taxRate: 18,
  taxInclusive: false, discountType: "percent", discount: 0, items: [], ...over,
});

describe("calculateQuotation", () => {
  it("adds tax on top of the subtotal", () => {
    const t = calculateQuotation(base({ items: [item("a", { quantity: 2, unitPrice: 5000 })] }));
    expect(t.subtotal).toBe(1_000_000);
    expect(t.tax).toBe(180_000);
    expect(t.grandTotal).toBe(1_180_000);
  });
  it("applies line discounts before tax", () => {
    const t = calculateQuotation(base({ items: [item("a", { discount: 10 })] }));
    expect(t.lineDiscounts).toBe(10_000);
    expect(t.tax).toBe(16_200); // 18% of 900
    expect(t.grandTotal).toBe(106_200);
  });
  it("supports fixed discounts and caps them at the line value", () => {
    const t = calculateQuotation(base({ items: [item("a", { discountType: "fixed", discount: 99_999 })] }));
    expect(t.grandTotal).toBe(0);
  });
  it("spreads a document discount across lines without losing a paisa", () => {
    const t = calculateQuotation(base({ discount: 10, taxRate: 0, items: [item("a", { unitPrice: 333.33 }), item("b", { unitPrice: 666.67 }), item("c", { unitPrice: 0.01 })] }));
    expect(t.documentDiscount).toBe(Math.round((t.subtotal * 10) / 100));
    const sum = Object.values(t.lines).reduce((s, l) => s + l.total, 0);
    expect(sum).toBe(t.grandTotal);
    expect(t.grandTotal).toBe(t.subtotal - t.discount);
  });
  it("uses per-line tax rates and groups them into buckets", () => {
    const t = calculateQuotation(base({ taxRate: 18, items: [item("a"), item("b", { taxRate: 5 }), item("c", { taxRate: 0 })] }));
    expect(t.taxBuckets.map((b) => b.rate)).toEqual([5, 18]);
    expect(t.tax).toBe(18_000 + 5_000);
  });
  it("extracts tax when prices are tax inclusive", () => {
    const t = calculateQuotation(base({ taxInclusive: true, items: [item("a", { unitPrice: 1180 })] }));
    expect(t.grandTotal).toBe(118_000);
    expect(t.tax).toBe(18_000);
  });
  it("ignores section rows and handles an empty quotation", () => {
    const t = calculateQuotation(base({ items: [{ kind: "section", id: "s", title: "Design" }, item("a")] }));
    expect(Object.keys(t.lines)).toEqual(["a"]);
    expect(calculateQuotation(base()).grandTotal).toBe(0);
  });
  it("is not confused by non-finite input", () => {
    const t = calculateQuotation(base({ items: [item("a", { unitPrice: Number.NaN })] }));
    expect(t.grandTotal).toBe(0);
  });
});

describe("money and numbering", () => {
  it("formats the four supported currencies", () => {
    expect(formatMoney(125000, "INR")).toContain("1,25,000");
    expect(formatMoney(1500.5, "USD")).toBe("$1,500.50");
    expect(formatMoney(10, "GBP")).toContain("£");
    expect(formatMoney(10, "EUR")).toContain("€");
  });
  it("pads quotation numbers", () => expect(formatQuotationNumber(2026, 7)).toBe("QT-2026-0007"));
  it("totals a pricing block including the selected package", () => {
    expect(pricingTotal({ id: "x", type: "pricing", currency: "INR", note: "", rows: [{ id: "r", name: "a", description: "", amount: 100.5 }],
      packages: [{ id: "p", name: "P", price: 50, description: "", features: [], selected: true }, { id: "q", name: "Q", price: 999, description: "", features: [], selected: false }] })).toBe(150.5);
  });
});

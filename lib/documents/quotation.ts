import type { Currency, QuotationData, QuotationItem } from "./content";

/**
 * Quotation maths in integer minor units (paise/cents) so totals never drift.
 * Order of operations:
 *   1. line gross = quantity x unit price
 *   2. line discount (percent or fixed), capped at the gross
 *   3. document discount, spread across lines in proportion to their net value
 *   4. tax per line at that line's rate (or the document rate)
 * With `taxInclusive`, unit prices already include tax, so tax is extracted, not added.
 */

export type LineResult = {
  id: string; gross: number; discount: number; net: number; taxRate: number; tax: number; total: number;
};
export type TaxBucket = { label: string; rate: number; taxable: number; tax: number };
export type QuotationTotals = {
  lines: Record<string, LineResult>;
  subtotal: number;          // sum of line gross
  lineDiscounts: number;
  documentDiscount: number;
  discount: number;          // lineDiscounts + documentDiscount
  taxable: number;           // amount tax is computed on
  taxBuckets: TaxBucket[];
  tax: number;
  grandTotal: number;
  currency: Currency;
};

const toMinor = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100);
export const fromMinor = (n: number) => n / 100;

function discountOf(type: "percent" | "fixed", value: number, base: number): number {
  const raw = type === "percent" ? Math.round((base * Math.min(Math.max(value, 0), 100)) / 100) : toMinor(value);
  return Math.min(Math.max(raw, 0), base);
}

/** Splits `total` across weights so the parts always add back up exactly. */
function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || total <= 0) return weights.map(() => 0);
  const parts = weights.map((w) => Math.floor((total * w) / sum));
  let remainder = total - parts.reduce((a, b) => a + b, 0);
  for (let i = 0; remainder > 0 && i < parts.length; i = (i + 1) % parts.length) {
    if (weights[i] > 0) { parts[i] += 1; remainder -= 1; }
  }
  return parts;
}

export function calculateQuotation(data: QuotationData): QuotationTotals {
  const items = data.items.filter((i): i is Extract<QuotationItem, { kind: "item" }> => i.kind === "item");

  const grosses = items.map((i) => Math.round(i.quantity * toMinor(i.unitPrice)));
  const lineDisc = items.map((i, idx) => discountOf(i.discountType, i.discount, grosses[idx]));
  const nets = grosses.map((g, idx) => g - lineDisc[idx]);
  const netSum = nets.reduce((a, b) => a + b, 0);

  const docDiscount = discountOf(data.discountType, data.discount, netSum);
  const docShares = allocate(docDiscount, nets);
  const afterDiscount = nets.map((n, idx) => n - docShares[idx]);

  const lines: Record<string, LineResult> = {};
  const buckets = new Map<number, TaxBucket>();
  let tax = 0;
  let taxable = 0;
  let grand = 0;

  items.forEach((item, idx) => {
    const rate = item.taxRate ?? data.taxRate;
    const base = afterDiscount[idx];
    let lineTax: number;
    let lineTaxable: number;
    let lineTotal: number;
    if (data.taxInclusive) {
      lineTotal = base;
      lineTaxable = Math.round(base / (1 + rate / 100));
      lineTax = base - lineTaxable;
    } else {
      lineTaxable = base;
      lineTax = Math.round((base * rate) / 100);
      lineTotal = base + lineTax;
    }
    lines[item.id] = {
      id: item.id, gross: grosses[idx], discount: lineDisc[idx] + docShares[idx], net: afterDiscount[idx],
      taxRate: rate, tax: lineTax, total: lineTotal,
    };
    const bucket = buckets.get(rate) ?? { label: data.taxLabel, rate, taxable: 0, tax: 0 };
    bucket.taxable += lineTaxable;
    bucket.tax += lineTax;
    buckets.set(rate, bucket);
    tax += lineTax;
    taxable += lineTaxable;
    grand += lineTotal;
  });

  const subtotal = grosses.reduce((a, b) => a + b, 0);
  const lineDiscounts = lineDisc.reduce((a, b) => a + b, 0);
  return {
    lines, subtotal, lineDiscounts, documentDiscount: docDiscount, discount: lineDiscounts + docDiscount,
    taxable, taxBuckets: [...buckets.values()].filter((b) => b.rate > 0 || b.tax > 0).sort((a, b) => a.rate - b.rate),
    tax, grandTotal: grand, currency: data.currency,
  };
}

const LOCALE: Record<Currency, string> = { INR: "en-IN", USD: "en-US", GBP: "en-GB", EUR: "de-DE" };

/** Formats an amount given in major units (e.g. 1500.5). */
export function formatMoney(amount: number, currency: Currency | string): string {
  const cur = (["INR", "USD", "GBP", "EUR"] as const).includes(currency as Currency) ? (currency as Currency) : "INR";
  return new Intl.NumberFormat(LOCALE[cur], { style: "currency", currency: cur, maximumFractionDigits: 2 }).format(amount);
}

/** Formats minor units. */
export const formatMinor = (minor: number, currency: Currency | string) => formatMoney(fromMinor(minor), currency);

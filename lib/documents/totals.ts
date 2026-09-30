import type { DocumentContent } from "./content";
import { calculateQuotation, fromMinor } from "./quotation";
import { pricingTotal } from "./util";

/** Amount and currency stored on the documents row so lists and dashboards don't need to parse content. */
export function documentTotals(content: DocumentContent): { amount: number | null; currency: string | null } {
  for (const s of content.sections) {
    for (const b of s.blocks) {
      if (b.type === "quotation") return { amount: fromMinor(calculateQuotation(b.data).grandTotal), currency: b.data.currency };
    }
  }
  for (const s of content.sections) {
    for (const b of s.blocks) {
      if (b.type === "pricing") {
        const total = pricingTotal(b);
        return { amount: total > 0 ? total : null, currency: b.currency };
      }
    }
  }
  return { amount: null, currency: null };
}

import { PRODUCT_NAME } from "@/components/ui/logo";
import { PLANS, YEARLY_MONTHS } from "@/lib/billing/plans";

/**
 * Every fact the public pages state about the product, in one place. Numbers come from the plan table that also
 * enforces the limits, so the pages, the FAQ answers and the app cannot say different things.
 */
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export const FACTS = {
  name: PRODUCT_NAME,
  documentTypes: "proposals, quotations, invoices, SEO audits and social media audits",
  free: { docs: PLANS.free.monthlyDocuments as number, ai: PLANS.free.aiPerMonth, people: PLANS.free.teamMembers as number },
  pro: { name: PLANS.professional.name, monthly: PLANS.professional.priceInr as number, yearly: (PLANS.professional.priceInr as number) * YEARLY_MONTHS, docs: PLANS.professional.monthlyDocuments as number, ai: PLANS.professional.aiPerMonth, people: PLANS.professional.teamMembers as number },
  agency: { name: PLANS.agency.name, monthly: PLANS.agency.priceInr as number, yearly: (PLANS.agency.priceInr as number) * YEARLY_MONTHS, ai: PLANS.agency.aiPerMonth, people: PLANS.agency.teamMembers as number },
  yearlyPaidMonths: YEARLY_MONTHS,
  refundDays: 7,
  replyTime: "one working day",
  inr,
};

export const freePlanLine = `${FACTS.free.docs} documents and ${FACTS.free.ai} AI actions a month`;
export const priceLine = `${inr(FACTS.pro.monthly)} a month for Pro and ${inr(FACTS.agency.monthly)} a month for Agency`;

/** Copy for plan cards. Numbers come from lib/billing/plans.ts so the site, the app and enforcement can't disagree. */
import { PLANS, type PlanId } from "@/lib/billing/plans";

export type PlanCard = { id: PlanId; name: string; blurb: string; features: string[]; highlight?: boolean };

const docs = (id: PlanId) => (PLANS[id].monthlyDocuments === null ? "Unlimited documents (fair use)" : `${PLANS[id].monthlyDocuments} documents per month`);
const members = (id: PlanId) => (PLANS[id].teamMembers === 1 ? "1 team member" : `Up to ${PLANS[id].teamMembers} team members`);

export const PLAN_CARDS: PlanCard[] = [
  { id: "free", name: PLANS.free.name, blurb: "Try the whole flow with a real client.",
    features: [docs("free"), `${PLANS.free.aiPerMonth} AI actions per month`, members("free"), "Proposals, quotations, invoices and audits", "PDF export and share links with view tracking", "Brand kit and standard templates"] },
  { id: "professional", name: PLANS.professional.name, highlight: true, blurb: "For a freelancer or small studio that sends documents every week.",
    features: [docs("professional"), `${PLANS.professional.aiPerMonth} AI actions per month`, members("professional"), "Everything in Free", "Premium report templates (Noir, Aurora, Sidebar)", "Email support"] },
  { id: "agency", name: PLANS.agency.name, blurb: "For an agency that writes proposals and audits every day.",
    features: [docs("agency"), `${PLANS.agency.aiPerMonth} AI actions per month`, "Up to 10 team members", "Everything in Pro", "Premium report templates", "Priority support"] },
  { id: "custom", name: PLANS.custom.name, blurb: "Bigger teams, higher AI volume or special requirements.",
    features: ["AI, document and team limits set for you", "Onboarding help", "Dedicated support", "Invoice and contract billing"] },
];

export const FEATURES = [
  { title: "One company profile", body: "Company details, logo, colors, fonts, terms and signature live in one place. Nobody retypes a phone number into a proposal again." },
  { title: "AI that knows your business", body: "Drafts come back as structured sections, not one wall of text. Rewrite, shorten, simplify or generate a timeline for any part." },
  { title: "Quotations that add up", body: "Line items, discounts, configurable tax and four currencies, calculated in whole paise and cents so totals never drift." },
  { title: "SEO and social media audits", body: "Scan a website for scored findings with plain-language fixes, or work through a social media checklist by hand and let the scorecard add itself up. Add your own sections for anything new." },
  { title: "PDFs and share links", body: "The same document becomes a PDF with page numbers or a private web link. Nothing is designed twice." },
  { title: "Know what the client did", body: "See when a link was opened, download activity, and whether they accepted, declined or asked for changes." },
];

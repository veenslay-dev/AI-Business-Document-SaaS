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

export const FAQ: { q: string; a: string }[] = [
  { q: "Do I need design skills?", a: "No. You choose colors, fonts and upload a logo once, and the templates handle layout, spacing and page breaks. You can still edit every section by hand." },
  { q: "Will the AI make things up?", a: "It is told to use only your company profile, services and knowledge base entries, and to leave out facts it doesn't have. It can still get things wrong, so every draft is editable and nothing is sent until you share it." },
  { q: "What happens to sent documents if I change my brand or phone number?", a: "New documents use your latest brand kit and details. When you share a document, its branding is saved with it, so documents you already sent keep the look and contact details they had." },
  { q: "Can clients sign?", a: "Clients can accept a proposal or quotation online by entering their name and email, agreeing to the terms and drawing or typing a signature. We record who accepted and when. Whether that is enough for your contracts depends on your jurisdiction, so check with a lawyer for anything high stakes." },
  { q: "What does the SEO audit check?", a: "HTTPS, indexability, robots.txt, sitemap, canonical tags, redirects, a sample of internal links, titles, descriptions, headings, image alt text, content length, structured data, server speed and, when available, Google PageSpeed results. It reads the home page and a handful of inner pages, so it is a fast health check rather than a full crawl." },
  { q: "Who can see my data?", a: "Only members of your workspace. Data lives in a Postgres database with row level security, so one company's records are never returned to another. Shared documents are reachable only through their private link." },
  { q: "What counts as an AI action?", a: "Each time the assistant drafts a proposal, rewrites a section, writes a line description or explains audit findings in plain language, that is one action. If the AI service fails and you get no result, the action is not counted." },
  { q: "How do I upgrade?", a: "Open Settings, then Subscription, and choose a plan. We'll confirm the payment details with you and switch the plan on for your workspace. Online card payments are planned." },
  { q: "Can I take payments from my clients through it?", a: "Not yet. You can create invoices with your payment details on them, but clients pay you directly." },
];

export const FEATURES = [
  { title: "One company profile", body: "Company details, logo, colors, fonts, terms and signature live in one place. Nobody retypes a phone number into a proposal again." },
  { title: "AI that knows your business", body: "Drafts come back as structured sections, not one wall of text. Rewrite, shorten, simplify or generate a timeline for any part." },
  { title: "Quotations that add up", body: "Line items, discounts, configurable tax and four currencies, calculated in whole paise and cents so totals never drift." },
  { title: "SEO and social media audits", body: "Scan a website for scored findings with plain-language fixes, or work through a social media checklist by hand and let the scorecard add itself up. Add your own sections for anything new." },
  { title: "PDFs and share links", body: "The same document becomes a PDF with page numbers or a private web link. Nothing is designed twice." },
  { title: "Know what the client did", body: "See when a link was opened, download activity, and whether they accepted, declined or asked for changes." },
];

import { PRODUCT_NAME } from "@/components/ui/logo";
import { FACTS, freePlanLine } from "@/lib/content/facts";
import { TEMPLATE_HUB, TEMPLATE_PAGES } from "./templates";

type PageKind = "home" | "pricing" | "about" | "contact" | "legal" | "auth" | "templates" | "template";

export type PageDef = {
  path: string;
  /** Name shown in the admin panel and used in breadcrumbs. */
  name: string;
  kind: PageKind;
  /** Default SEO title. Pages other than "absolute" ones get " | PrioDraft" added. */
  title: string;
  absoluteTitle?: boolean;
  description: string;
  /** Default on-page heading and intro, shown as hints in the admin form. Only pages with `content` use overrides. */
  heading?: string;
  intro?: string;
  content: boolean;
  noindex?: boolean;
  /** For nested pages: the page above this one in the breadcrumb. */
  parent?: string;
};

export const PAGES: PageDef[] = [
  { path: "/", name: "Home", kind: "home", absoluteTitle: true, content: true,
    title: `${PRODUCT_NAME}: Proposal and Quotation Software for Agencies`,
    description: "Create branded proposals, quotations, invoices and SEO audits with AI. Share by link, track opens and collect online acceptance. Free plan available.",
    heading: "Create proposals, quotations, invoices and audits that look like your company made them.",
    intro: `${PRODUCT_NAME} is proposal and quotation software for agencies and freelancers. Build your company profile once, draft client documents with AI, and send them as tracked links or PDFs.` },
  { path: "/pricing", name: "Pricing", kind: "pricing", content: true, title: `${PRODUCT_NAME} Pricing: Free, Pro and Agency Plans (INR)`, absoluteTitle: true,
    description: `${PRODUCT_NAME} plans in INR: Free with ${freePlanLine}, Pro at ${FACTS.inr(FACTS.pro.monthly)} a month and Agency at ${FACTS.inr(FACTS.agency.monthly)} a month. No auto-renewal.`,
    heading: `${PRODUCT_NAME} pricing: start free, upgrade when you need more`,
    intro: `Start free with ${freePlanLine}. Pro is ${FACTS.inr(FACTS.pro.monthly)} a month and Agency is ${FACTS.inr(FACTS.agency.monthly)} a month, or pay for a year and get two months free. Every plan is charged in Indian rupees and none renews automatically.` },
  { path: "/about", name: "About", kind: "about", content: true, title: `About ${PRODUCT_NAME}: Client Document Software for Agencies`, absoluteTitle: true,
    description: `${PRODUCT_NAME} helps agencies, freelancers and consultants create branded proposals, quotations, invoices and audits, send them by link and get them accepted online.`,
    heading: "Professional client documents, without the busywork",
    intro: `${PRODUCT_NAME} is client document software for agencies, consultants and freelancers who write proposals, quotations, invoices and audit reports and want each one to look like it came from a bigger company.` },
  { path: "/contact", name: "Contact", kind: "contact", content: true, title: `Contact ${PRODUCT_NAME}: Support, Upgrades and Custom Plans`, absoluteTitle: true,
    description: `Contact ${PRODUCT_NAME} for help with your account, plan upgrades, refunds or a custom plan. We reply by email, usually within ${FACTS.replyTime}.`,
    heading: "Get in touch", intro: `Questions, feedback or a problem with your account? Send us a message and we'll reply by email, usually within ${FACTS.replyTime}.` },
  { path: TEMPLATE_HUB.path, name: "Templates", kind: "templates", content: true, title: TEMPLATE_HUB.title, description: TEMPLATE_HUB.description, heading: TEMPLATE_HUB.h1, intro: TEMPLATE_HUB.intro },
  ...TEMPLATE_PAGES.map((t) => ({ path: t.path, name: t.name, kind: "template" as const, content: true, title: t.title, description: t.description, heading: t.h1, intro: t.intro, parent: TEMPLATE_HUB.path })),
  { path: "/terms", name: "Terms of Service", kind: "legal", content: true, title: "Terms of Service",
    description: `The terms that apply when you use ${PRODUCT_NAME} to create, share and track business documents.`, heading: "Terms of Service" },
  { path: "/privacy", name: "Privacy Policy", kind: "legal", content: true, title: "Privacy Policy",
    description: `What personal information ${PRODUCT_NAME} collects, why, who it is shared with, and the choices you have.`, heading: "Privacy Policy" },
  { path: "/refund-policy", name: "Refund Policy", kind: "legal", content: true, title: "Refund Policy",
    description: `When ${PRODUCT_NAME} refunds a payment, how to ask for a refund, how long it takes to reach your account and the cases we cannot refund.`, heading: "Refund Policy" },
  { path: "/login", name: "Sign in", kind: "auth", content: false, noindex: true, title: "Sign in", description: `Sign in to your ${PRODUCT_NAME} account.` },
  { path: "/signup", name: "Create account", kind: "auth", content: false, noindex: true, title: "Create your account", description: `Create a free ${PRODUCT_NAME} account.` },
  { path: "/forgot-password", name: "Forgot password", kind: "auth", content: false, noindex: true, title: "Forgot password", description: "Reset your password by email." },
];

export const PAGE_BY_PATH: Record<string, PageDef> = Object.fromEntries(PAGES.map((p) => [p.path, p]));

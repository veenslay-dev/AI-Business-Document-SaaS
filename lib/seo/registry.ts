import { PRODUCT_NAME } from "@/components/ui/logo";

export type PageKind = "home" | "pricing" | "about" | "contact" | "legal" | "auth";

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
};

export const PAGES: PageDef[] = [
  { path: "/", name: "Home", kind: "home", absoluteTitle: true, content: true,
    title: `${PRODUCT_NAME}: branded proposals, quotations and SEO audits`,
    description: "Build your company profile once. Generate branded proposals, quotations and SEO audits in minutes with AI, share them by link and see when clients open and accept them.",
    heading: "Create proposals, quotations and audits that look like your company created them.", intro: "Build your company profile once. Generate branded client documents in minutes with AI." },
  { path: "/pricing", name: "Pricing", kind: "pricing", content: true, title: "Pricing",
    description: `${PRODUCT_NAME} plans: a free plan with 10 documents and 3 AI actions a month, Pro and Agency plans with more documents, AI and team members, and a custom plan.`,
    heading: "Simple, fair pricing", intro: "Start free with 10 documents and 3 AI actions a month. Upgrade when you need more documents, more AI and more people. Need something bigger? Ask for a custom plan." },
  { path: "/about", name: "About", kind: "about", content: true, title: "About",
    description: `${PRODUCT_NAME} helps agencies and freelancers send proposals, quotations, invoices and audits that look like their own company made them.`,
    heading: "Professional client documents, without the busywork", intro: `${PRODUCT_NAME} is for agencies, consultants and freelancers who write proposals, quotations, invoices and audit reports and want each one to look like it came from a bigger company.` },
  { path: "/contact", name: "Contact", kind: "contact", content: true, title: "Contact",
    description: `Contact ${PRODUCT_NAME} for help, plan upgrades or a custom plan.`,
    heading: "Get in touch", intro: "Questions, feedback or a problem with your account? Send us a message and we'll reply by email." },
  { path: "/terms", name: "Terms of Service", kind: "legal", content: true, title: "Terms of Service",
    description: `The terms that apply when you use ${PRODUCT_NAME} to create, share and track business documents.`, heading: "Terms of Service" },
  { path: "/privacy", name: "Privacy Policy", kind: "legal", content: true, title: "Privacy Policy",
    description: `What personal information ${PRODUCT_NAME} collects, why, who it is shared with, and the choices you have.`, heading: "Privacy Policy" },
  { path: "/refund-policy", name: "Refund Policy", kind: "legal", content: true, title: "Refund Policy",
    description: `When ${PRODUCT_NAME} refunds a payment, how to ask for one, and how long it takes.`, heading: "Refund Policy" },
  { path: "/login", name: "Sign in", kind: "auth", content: false, noindex: true, title: "Sign in", description: `Sign in to your ${PRODUCT_NAME} account.` },
  { path: "/signup", name: "Create account", kind: "auth", content: false, noindex: true, title: "Create your account", description: `Create a free ${PRODUCT_NAME} account.` },
  { path: "/forgot-password", name: "Forgot password", kind: "auth", content: false, noindex: true, title: "Forgot password", description: "Reset your password by email." },
];

export const PAGE_BY_PATH: Record<string, PageDef> = Object.fromEntries(PAGES.map((p) => [p.path, p]));

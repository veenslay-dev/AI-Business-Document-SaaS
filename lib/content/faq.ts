import { FACTS, freePlanLine, priceLine } from "./facts";
import { AUDIT_LANDING } from "@/lib/seo/audit-landing";
import { TEMPLATE_BY_PATH, TEMPLATE_HUB } from "@/lib/seo/templates";

const { name, free, pro, agency, inr } = FACTS;

/**
 * The FAQ bank. A question has one answer here and every page that shows it reads it from this file, so two pages
 * can never answer the same question differently. Answers start with the direct answer, then the detail.
 */
export const FAQ_BANK = {
  what: { q: `What is ${name}?`, a: `${name} is online software for agencies, freelancers and consultants to create branded ${FACTS.documentTypes}. You set up your company profile once, draft documents with AI, share them as private tracked links or PDFs, and clients can accept them online.` },
  who: { q: `Who is ${name} for?`, a: `${name} is for agencies, freelancers and consultants who send client documents, especially SEO, web design and digital marketing businesses. It also suits any small business that sends proposals, quotations or invoices regularly.` },
  freePlan: { q: `Is there a free plan?`, a: `Yes. The Free plan includes ${freePlanLine}, PDF export, share links with view tracking and one team member. No card is needed to start.` },
  plans: { q: `How much does ${name} cost?`, a: `The Free plan costs nothing. Paid plans are ${priceLine}, charged in Indian rupees. Paying for a year costs ${FACTS.yearlyPaidMonths} months instead of 12, which is ${inr(pro.yearly)} for Pro and ${inr(agency.yearly)} for Agency. A custom plan is available for larger needs.` },
  planDifference: { q: `What is the difference between the Free, Pro and Agency plans?`, a: `Free includes ${free.docs} documents and ${free.ai} AI actions a month for one person. Pro includes ${pro.docs} documents, ${pro.ai} AI actions and up to ${pro.people} team members. Agency includes unlimited documents under fair use, ${agency.ai} AI actions and up to ${agency.people} team members. Pro and Agency also include the premium audit report templates.` },
  howPay: { q: `How do I pay and upgrade?`, a: `Open Settings, then Subscription, choose Pro or Agency and pay online with Razorpay, which supports UPI, cards and net banking depending on your bank. The plan switches on as soon as the payment clears. If you would rather arrange it with us, use the contact form.` },
  autoRenew: { q: `Do paid plans renew automatically?`, a: `No. A paid plan runs for one month or one year from the day you pay, and it does not renew on its own, so there is nothing to cancel. When the period ends, your workspace returns to the Free plan's limits and your documents stay in your account. Pay again whenever you want to continue.` },
  refund: { q: `Can I get a refund?`, a: `Yes, within ${FACTS.refundDays} days of your first payment for a plan, provided the plan has not been used heavily or against the Terms of Service. Duplicate charges and billing mistakes are always refunded. The full conditions are on the Refund Policy page.` },
  currency: { q: `Which currency do you charge in?`, a: `Plans are charged in Indian rupees (INR) only. The documents you create can use INR, USD, GBP or EUR for your own clients' prices.` },
  gstOnPlans: { q: `What GST rate should I use on my quotations?`, a: `Use the rate that applies to your business. Web design and development services in India are commonly charged at 18 percent GST, which is the default in ${name}, but check your registration and the place of supply with your accountant. You can change the rate for a whole quotation or for a single line.` },
  customPlan: { q: `Can I get a custom plan?`, a: `Yes. If you need more AI actions, documents or team members than the standard plans, send a request through the contact page. We reply by email, usually within ${FACTS.replyTime}.` },
  aiAction: { q: `What counts as an AI action?`, a: `Each time the assistant drafts a proposal, rewrites a section, writes a line description or explains audit findings in plain language, that is one action. If the AI service fails and you get no result, the action is not counted. Actions reset on the first of each month and do not roll over.` },
  aiAccuracy: { q: `Will the AI make things up?`, a: `It can get things wrong, so every AI draft is editable and nothing reaches a client until you share it. The assistant is told to use only your company profile, services and knowledge base and to leave out facts it does not have.` },
  design: { q: `Do I need design skills?`, a: `No. You choose colors and fonts and upload a logo once, and the templates handle layout, spacing and page breaks. You can still edit every section by hand.` },
  brandChange: { q: `What happens to sent documents if I change my brand or phone number?`, a: `Documents you already shared keep the look and contact details they had, because the branding is saved with a document when you share it. New documents use your latest brand kit and details.` },
  sign: { q: `Can clients sign or accept online?`, a: `Yes. A client can accept a proposal or quotation online by entering their name and email, agreeing to the terms and drawing or typing a signature. ${name} records who accepted and when. Whether that is enough for your contracts depends on your jurisdiction, so take legal advice for anything high stakes.` },
  seoAudit: { q: `What does the SEO audit check?`, a: `It checks HTTPS, indexability, robots.txt, the sitemap, canonical tags, redirects, a sample of internal links, titles, descriptions, headings, image alt text, content length, structured data, server speed and, when available, Google PageSpeed results. It reads the home page and a handful of inner pages, so it is a fast health check rather than a full crawl.` },
  socialAudit: { q: `How does the social media audit work?`, a: `You review the client's public accounts and work through checklists for profiles, content, engagement and each platform, marking every checkpoint Good, Needs work, Poor or N/A. Notes, recommendations, priorities and screenshots go alongside, and a scorecard adds itself up.` },
  data: { q: `Who can see my data?`, a: `Only members of your workspace. Each company's records are separated in the database, so one company's data is never returned to another. Shared documents can only be opened with their private link.` },
  tracking: { q: `Can I see when a client opens a document?`, a: `Yes. Each shared document has a private link, and you see when it was opened, when the PDF was downloaded and whether the client accepted, declined or asked for changes. Tracking stores a one-way hashed IP address and the browser type, nothing more.` },
  clientPayments: { q: `Can I collect payments from my clients through ${name}?`, a: `Not yet. You can create invoices with your own payment details on them, and your clients pay you directly.` },
  team: { q: `Can my team use one account?`, a: `Yes, within your plan. The Free plan has ${free.people} team member, Pro allows up to ${pro.people} and Agency up to ${agency.people}. Owners and admins invite people and set their roles.` },
  reply: { q: `How fast do you reply?`, a: `We reply by email, usually within ${FACTS.replyTime}. Include your account email and, for billing questions, your Razorpay payment ID so we can find the payment quickly.` },
  deleteAccount: { q: `How do I delete my account?`, a: `Write to us through the contact page from the email address on the account and ask for it to be deleted. We delete your workspace content and account details, and keep only the payment records the law requires.` },
  quoteVsInvoice: { q: `What is the difference between a quotation and an invoice?`, a: `A quotation is an offer made before work starts, with the scope and the price. An invoice is issued when you supply the service and ask for payment. ${name} has separate documents for both, with your company and GST details filled in.` },
  templatesFree: { q: `Are the templates free to use?`, a: `Yes. You can start with any template on the Free plan, which includes ${freePlanLine}. The premium audit report layouts (Noir, Aurora and Sidebar) need a Pro or Agency plan.` },
  editTemplates: { q: `Can I change the text and layout of a template?`, a: `Yes. Every section can be edited, added, removed and reordered, and you can switch the layout without rewriting anything. Your logo, colors, fonts and terms are applied automatically.` },
} as const;

type FaqId = keyof typeof FAQ_BANK;
export type FaqItem = { q: string; a: string };

const pick = (...ids: FaqId[]): FaqItem[] => ids.map((id) => FAQ_BANK[id]);

/** The questions shown on each main page, in order. Template pages carry their own, written for that template. */
export const PAGE_FAQ: Record<string, FaqItem[]> = {
  "/": pick("what", "who", "freePlan", "design", "aiAccuracy", "brandChange", "sign", "seoAudit", "data", "tracking"),
  "/pricing": pick("plans", "freePlan", "planDifference", "howPay", "autoRenew", "refund", "currency", "aiAction", "customPlan", "team"),
  "/about": pick("what", "who", "aiAccuracy", "data", "clientPayments", "quoteVsInvoice"),
  "/contact": pick("reply", "customPlan", "refund", "howPay", "deleteAccount"),
  [AUDIT_LANDING.path]: [...AUDIT_LANDING.faq.first, FAQ_BANK.freePlan, ...AUDIT_LANDING.faq.second, FAQ_BANK.plans],
  [TEMPLATE_HUB.path]: pick("templatesFree", "editTemplates", "gstOnPlans", "quoteVsInvoice", "socialAudit", "design"),
};

/** The questions for any public page, or none. */
export const faqFor = (path: string): FaqItem[] => TEMPLATE_BY_PATH[path]?.faq ?? PAGE_FAQ[path] ?? [];

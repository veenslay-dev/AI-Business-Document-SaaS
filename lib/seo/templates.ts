import { PRODUCT_NAME } from "@/components/ui/logo";
import { PLANS } from "@/lib/billing/plans";

export type TemplateSlug = "seo-proposal" | "website-quotation-gst" | "social-media-audit" | "digital-marketing-proposal";

export type TemplatePage = {
  slug: TemplateSlug;
  path: string;
  /** Short name used in menus and cards. */
  name: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  /** What kind of document it makes, and where it opens in the app. */
  kind: "proposal" | "quotation" | "social_audit";
  appPath: string;
  bestFor: string;
  includes: string[];
  steps: { title: string; body: string }[];
  tips: string[];
  faq: { q: string; a: string }[];
  sampleNote: string;
};

const free = `${PLANS.free.monthlyDocuments} documents and ${PLANS.free.aiPerMonth} AI actions a month`;

export const TEMPLATE_HUB = {
  path: "/document-templates",
  h1: "Business document templates for agencies and freelancers",
  title: "Document Templates",
  description: `Sample proposals, quotations and audits you can reuse: an SEO proposal, a website quotation with GST, a social media audit and a digital marketing proposal, all ready to brand and send with ${PRODUCT_NAME}.`,
  intro: "Each template below is a real sample document, built with the same engine that makes your own. Open one to see every section, then start with it free. Your logo, colors, fonts and terms are applied automatically.",
};

export const TEMPLATE_PAGES: TemplatePage[] = [
  {
    slug: "seo-proposal", path: "/document-templates/seo-proposal", name: "SEO Proposal Template", kind: "proposal", appPath: "/proposals/new",
    h1: "SEO proposal template", title: "SEO Proposal Template",
    description: "A ready to edit SEO proposal with an executive summary, challenges, goals, strategy, timeline, pricing packages and terms. Brand it, send it by link and see when your client opens it.",
    intro: "An SEO proposal has one job: help the client see what is wrong, what you will do about it, and what it costs. This template follows that order, so you spend your time on the client's details rather than on layout.",
    bestFor: "Freelance SEOs and agencies pitching a one-time audit and fix, or a monthly retainer.",
    includes: ["Executive summary in plain language", "What is holding the site back today", "Goals with something measurable, such as enquiries", "Strategy split into technical fixes, content, local search and links", "Deliverables list so the scope is clear", "A phased timeline", "Pricing packages shown next to itemised fees", "Terms, and online acceptance with a signature"],
    steps: [
      { title: "Choose the client and describe the job", body: "Add the website, the goal and a rough budget. The brief takes a couple of minutes." },
      { title: "Review the AI draft", body: "You get a full first version in your own branding. Every section is editable, and the AI only works from what you gave it." },
      { title: "Adjust packages and prices", body: "Mark the package you recommend, change the amounts, and add a note on what is excluded." },
      { title: "Send a link and watch for the open", body: "Share a private link. You see when it is opened, and your client can accept, decline or ask for changes online." },
    ],
    tips: ["Write goals in the client's terms, such as calls or booked appointments, not only keyword positions.", "State a minimum term for retainers so the first month is not a trial by accident.", "Say what is not included, for example content writing costs or paid tools.", "Do not promise rankings. No one controls them. Promise the work and how you will report on it."],
    faq: [
      { q: "What should an SEO proposal include?", a: "A short summary, the problems you found, the goals, your plan, a timeline, the price and the terms. A client should be able to decide after reading the first page and the pricing." },
      { q: "How long should it be?", a: "Short enough to be read. Most good SEO proposals are a few pages. Put detail in the audit and keep the proposal about the decision." },
      { q: "Should I guarantee rankings?", a: "No. Search results depend on factors you do not control. Commit to specific actions, deliverables and reporting, and set expectations about timing." },
      { q: "Can I use my own logo and colors?", a: `Yes. Set your logo, colors, fonts and default terms once in the brand kit and every proposal uses them. The ${PRODUCT_NAME} Free plan includes ${free}.` },
    ],
    sampleNote: "Sample proposal for a fictional furniture business. Names and figures are made up.",
  },
  {
    slug: "website-quotation-gst", path: "/document-templates/website-quotation-gst", name: "Website Quotation with GST", kind: "quotation", appPath: "/quotations/new",
    h1: "Website quotation format with GST", title: "Website Quotation Format with GST",
    description: "A website design and development quotation with scope of work, line items, discounts, GST at your chosen rate, a payment schedule and acceptance. Your GSTIN prints on every copy.",
    intro: "A good website quotation says what is included, what it costs and when you will be paid. This format puts the scope first, then the priced line items with GST worked out for you, so the client knows the total before work starts.",
    bestFor: "Web designers, developers and agencies in India quoting a website build, redesign or ongoing maintenance.",
    includes: ["Your company details with GSTIN and PAN", "Quotation number, date and validity period", "Scope of work: overview, what is included, deliverables and timeline", "Line items with quantity, rate and a discount per line", "GST calculated at your rate, with the tax and the total shown clearly", "A payment schedule, for example 50 percent at the start and 50 percent on launch", "Terms and conditions", "Online acceptance by the client"],
    steps: [
      { title: "Add your GST details once", body: "Put your GSTIN and PAN in the company profile. They print on every quotation and invoice." },
      { title: "Set the tax name and rate", body: "The default is GST at 18 percent. You can change the rate for the whole quotation or for a single line, and choose whether your prices include tax." },
      { title: "Add the scope and line items", body: "Describe what you will build, then add priced items. Totals, discounts and tax update as you type." },
      { title: "Send it for acceptance", body: "Share a private link for the client to accept online. When the work starts, issue an invoice from the same workspace with your company and GST details already filled in." },
    ],
    tips: ["Write the scope before the price. Most disagreements come from an unclear scope, not an unclear total.", "State what is not included, such as stock photos, content writing, hosting and domain costs.", "Set an expiry date so an old quote does not come back months later at the same price.", "Check your GST rate and registration with your accountant. The right treatment depends on your situation."],
    faq: [
      { q: "What GST rate applies to website design and development?", a: "Web design and development services are commonly charged at 18 percent GST in India, but the correct treatment depends on your registration and the place of supply. Confirm with your chartered accountant. The template lets you set whatever rate applies." },
      { q: "Does the quotation show CGST and SGST separately?", a: "It shows GST as one clearly labelled tax line at the rate you choose. If you need the CGST and SGST or IGST split on the paper, add it in the notes or issue it on your tax invoice as your accountant advises." },
      { q: "What is the difference between a quotation and an invoice?", a: "A quotation is an offer made before work begins. An invoice is issued when you supply the service and ask for payment, and it has its own required details. This tool has a separate invoice document for that stage." },
      { q: "Can I show prices inclusive of GST?", a: "Yes. Turn on tax inclusive pricing and the totals are worked out backwards from your prices. Leave it off to add GST on top." },
    ],
    sampleNote: "Sample quotation for a fictional dental clinic. Names, GSTIN and figures are made up.",
  },
  {
    slug: "social-media-audit", path: "/document-templates/social-media-audit", name: "Social Media Audit Template", kind: "social_audit", appPath: "/social-audits/new",
    h1: "Social media audit template", title: "Social Media Audit Template",
    description: "A social media audit template with a scorecard, checklists for profiles, content, engagement and each platform, notes, screenshots and prioritised recommendations, ready to send as a branded report.",
    intro: "A social media audit is a checklist you complete while reviewing a brand's accounts. This template gives you the checkpoints, a scorecard that updates as you go, and a report layout your client can read in a few minutes.",
    bestFor: "Social media managers and agencies who want a repeatable audit for pitches, onboarding and quarterly reviews.",
    includes: ["A scorecard with an overall score and a score for each area", "General checklists: profiles and branding, content strategy, creative quality, engagement, growth, conversion, paid social and reporting", "Platform sections for Instagram, Facebook, LinkedIn, YouTube, X, TikTok and Pinterest", "Each checkpoint marked Good, Needs work, Poor or Not applicable", "A note, a recommendation and a priority for each finding", "Space for screenshots that appears only when you add one", "Custom sections for anything specific to the client", "A key findings and recommendations summary"],
    steps: [
      { title: "Pick the accounts and sections", body: "Add the handles you are reviewing and choose which sections apply. Skip paid social if the brand does not run ads." },
      { title: "Work through the checklists", body: "Mark each checkpoint and add what you saw. The scorecard updates as you go." },
      { title: "Add evidence and recommendations", body: "Attach screenshots, write the fix, and set a priority so the client knows where to start." },
      { title: "Share the report", body: "Send it as a private link or a PDF in your branding. A screenshot area only appears when you add a screenshot." },
    ],
    tips: ["Audit against the client's goal. A brand that wants bookings needs different checks from one that wants reach.", "Always write the fix next to the problem. A list of issues alone is not a plan.", "Use screenshots for the three or four findings that matter most.", "Repeat the same audit each quarter so the client can see the score move."],
    faq: [
      { q: "What should a social media audit cover?", a: "Profile completeness and branding, what is being posted and how often, how the brand engages with its audience, whether the audience is growing, how social leads to action, and how results are measured. Add platform specific checks for each account." },
      { q: "How is the score worked out?", a: "Good counts as full marks, Needs work as half and Poor as none. Checkpoints you have not checked yet, or marked not applicable, are left out of the score." },
      { q: "Can I add my own checkpoints?", a: "Yes. You can add custom sections and edit the text of any checkpoint so the audit fits the client." },
      { q: "Do I need the brand's login?", a: "No. This is a review of public profiles and content you can see. Add insights from the brand's analytics where the client shares them." },
    ],
    sampleNote: "Sample audit for a fictional dental clinic, left part completed as a reviewer would leave it.",
  },
  {
    slug: "digital-marketing-proposal", path: "/document-templates/digital-marketing-proposal", name: "Digital Marketing Proposal", kind: "proposal", appPath: "/proposals/new",
    h1: "Digital marketing proposal template", title: "Digital Marketing Proposal Template",
    description: "A digital marketing proposal template covering SEO, paid ads, social media and email, with deliverables, a 90 day timeline, retainer pricing and terms. Edit it, brand it and send it by link.",
    intro: "A digital marketing proposal has to make several channels feel like one plan. This template ties search, ads, social and email to the same goals and shows the client exactly what each month of fees buys.",
    bestFor: "Marketing agencies and consultants proposing a multi-channel retainer.",
    includes: ["An executive summary tied to the client's goals", "Current gaps across search, ads, social and email", "Objectives with a way to measure each", "A plan for every channel in scope", "Deliverables per month", "A timeline for the first 90 days", "Retainer packages with ad spend shown separately", "Reporting, terms and online acceptance"],
    steps: [
      { title: "Describe the client and the channels", body: "Say which services you are proposing and what the client wants to achieve." },
      { title: "Review and edit the draft", body: "Get a structured first version, then change any section or add your own." },
      { title: "Set packages and separate ad spend", body: "Show your management fee and say clearly that ad spend is paid to the platforms by the client." },
      { title: "Send and track", body: "Share a private link, see when it is opened, and let the client accept online." },
    ],
    tips: ["Keep ad spend and your fee on separate lines so the client never confuses them.", "Tie every channel to one goal, such as qualified enquiries, so the plan reads as one strategy.", "Agree how you will report before you start, and put the reporting day in the proposal.", "Offer three packages and mark the one you recommend."],
    faq: [
      { q: "What should a digital marketing proposal include?", a: "The goals, the gaps you see today, the plan for each channel, what you will deliver each month, the timeline, the fees and the terms. Make it clear what is and is not included." },
      { q: "How do I price ad management?", a: "Many agencies charge a fixed monthly fee or a share of ad spend, and some combine them. Whatever you choose, show it separately from the ad budget and write it down in the proposal." },
      { q: "Should I include results in the proposal?", a: "Include goals and how you will measure them. Avoid promising specific results unless you control every factor behind them." },
      { q: "Can the client accept online?", a: "Yes. The client opens your link, can accept with a signature, decline, or ask for changes, and you see each step." },
    ],
    sampleNote: "Sample proposal for a fictional real estate developer. Names and figures are made up.",
  },
];

export const TEMPLATE_BY_PATH: Record<string, TemplatePage> = Object.fromEntries(TEMPLATE_PAGES.map((t) => [t.path, t]));
export const TEMPLATE_BY_SLUG = (slug: string) => TEMPLATE_PAGES.find((t) => t.slug === slug) ?? null;

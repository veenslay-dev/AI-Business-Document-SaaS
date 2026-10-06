import { PRODUCT_NAME } from "@/components/ui/logo";
import { AUDIT_EXTRA_PAGES, AUDIT_LINK_CHECKS, AUDITS_PER_HOUR } from "@/lib/audit/limits";
import { FACTS, freePlanLine } from "@/lib/content/facts";

/**
 * Copy for the SEO Audit Report Generator page. Every check listed here is one the scanner really runs (a test compares
 * the list with the scanner), the numbers come from the scanner's own limits and the plan table, and nothing claims a
 * full site crawl, white-label reports or reseller options, because the tool has none of those.
 */
export const AUDIT_LANDING = {
  path: "/seo-audit-report-generator",
  name: "SEO Audit Report Generator",
  title: "SEO Audit Report Generator for Agencies and Freelancers",
  description: "Generate a branded SEO audit report for your client or lead, share it as a tracked link, and turn it into a proposal. INR pricing, flat seats.",
  h1: "SEO Audit Report Generator for Agencies and Freelancers",
  heroLine: "Audit a lead's website in your own brand, in minutes.",
  intro: `${PRODUCT_NAME} is an online SEO audit report maker. Enter a website address and it scans the site, scores it by category and writes up the findings and fixes in a report with your logo and colors. Edit it, then send it as a tracked link or a PDF.`,
  freeNote: `The Free plan includes ${freePlanLine}. No card needed.`,

  scope: `Every audit is a fast health check of the home page and up to ${AUDIT_EXTRA_PAGES} inner pages, plus a sample of up to ${AUDIT_LINK_CHECKS} links. It is not a full site crawl, so for a very large site treat it as a quick first look and a way to start the conversation.`,

  /** [check id, name]. The name is the finding's title in the report. */
  groups: [
    { title: "Technical SEO", checks: [["https", "HTTPS"], ["status", "Status code"], ["indexability", "Indexability"], ["robots", "Robots.txt"], ["sitemap", "XML sitemap"], ["canonical", "Canonical tag"], ["broken-links", "Broken links"], ["redirects", "Redirects"], ["versions", "One version of the site (www and https)"], ["404-page", "Custom 404 page"], ["mixed-content", "Mixed content"], ["security-headers", "Security headers"], ["url-structure", "URL structure"]] },
    { title: "On-page SEO", checks: [["title", "Title tag"], ["meta-description", "Meta description"], ["h1", "H1 heading"], ["h2", "Subheadings (H2)"], ["heading-order", "Heading hierarchy"], ["alt", "Image alt text"], ["viewport", "Mobile viewport"], ["favicon", "Favicon"]] },
    { title: "Performance", checks: [["server-response", "Server response time"], ["page-weight", "HTML size"], ["page-speed", "Page speed (mobile)"], ["cwv", "Core Web Vitals"], ["lazy-images", "Lazy loading images"]] },
    { title: "Structured data", checks: [["schema", "Schema markup detected"], ["schema-errors", "Schema errors"]] },
    { title: "Content", checks: [["thin", "Thin content"], ["duplicates", "Duplicate titles and descriptions"], ["opportunities", "Content opportunities"]] },
    { title: "Analytics and tracking", checks: [["analytics", "Analytics installed"], ["search-console", "Google Search Console"]] },
    { title: "Social sharing", checks: [["open-graph", "Open Graph tags"], ["twitter-card", "X (Twitter) card"]] },
  ] as { title: string; checks: [string, string][] }[],
  pageSpeedNote: "Page speed and Core Web Vitals appear when Google's PageSpeed data is available for the site.",

  alsoInReport: [
    "A health score for each category and an overall score, so the lead sees where the site stands at a glance.",
    "Every finding with its priority, why it matters, the recommended fix and the page it affects.",
    "A 15-point audit checklist. The points the scan can answer are filled in for you.",
    "Optional plain-language explanations of the findings, written by AI from the scan results, which you can edit.",
    "A next steps section with your contact details.",
  ],
  notIncluded: "The scan does not crawl the whole site and has no keyword ranking or backlink data. The checklist points for organic traffic trend, keyword rankings, backlink profile and competitor analysis are left for you to complete from your own tools.",

  sample: {
    live: (host: string, date: string) => `A real audit of ${host}, run with ${PRODUCT_NAME} on ${date}. ${PRODUCT_NAME} is both the author and the client, so no made-up company appears.`,
    none: "Run the same audit on your own website and the report appears in your account in minutes.",
  },

  steps: [
    { title: "Set your brand once", body: "Create a free account and add your logo, colors, fonts, contact details and standard terms. Every report uses them." },
    { title: "Add the client or lead", body: "Add the company and a contact name. The audit, and any proposal or quotation you write next, will sit under this client." },
    { title: "Start a new SEO audit", body: "Choose the client, enter the website address and pick a report layout. Tick the AI option if you want plain-language explanations of the findings." },
    { title: "Let the scan run", body: `PrioDraft reads the home page and up to ${AUDIT_EXTRA_PAGES} inner pages, checks a sample of links and builds the scored report. It only scans public websites, never private or internal addresses.` },
    { title: "Review and edit", body: "Change any wording, add your own sections, attach screenshots and fill in the checklist points the scan could not answer." },
    { title: "Send it and see what happens", body: "Download a PDF or share a private link. You can see when the link is opened and when the PDF is downloaded." },
  ],

  branded: {
    intro: "A report that looks like it came from your company is easier to trust and easier to forward. PrioDraft applies your brand to every audit automatically.",
    points: [
      "Your logo, colors and fonts from the brand kit, on the cover and on every page.",
      "Premium cover layouts (Noir, Aurora and Sidebar) on the Pro and Agency plans, with standard layouts on Free.",
      "A PDF with page numbers, or a private link that opens in any browser.",
      "Link tracking: see when the client opened the report and when the PDF was downloaded.",
      "The branding is saved when you share, so a report you already sent never changes if you update your brand later.",
    ],
  },

  workflow: {
    intro: "An audit tells a lead what is wrong. The next question is always what it will cost to fix. In PrioDraft the audit, the proposal and the quotation for that lead sit under one client record, in one brand, so the next document starts with the company details already filled in.",
    flow: [
      "Run the audit for the lead and review the findings.",
      "Start an SEO proposal for the same client and write the brief from the audit's most important findings. The AI drafts the proposal for you to edit.",
      "Price the work in a quotation, with GST at the rate you choose.",
      "Send each document as a tracked link and see when the lead reads it.",
    ],
    story: "This is the workflow PrioDraft was built around. Going from an audit to a proposal used to take its founder three to four hours of copying, formatting and pricing. It now takes about thirty minutes.",
  },

  audiences: [
    { title: "Agencies", body: `Keep every client's audit, proposal and quotation in one place, in one brand. The Pro plan includes up to ${FACTS.pro.people} team members and Agency up to ${FACTS.agency.people}, at the same flat monthly price.` },
    { title: "Freelancers", body: `Audit a prospect's site before the first call and send the report as a conversation starter. The Free plan includes ${freePlanLine}, so you can try it on a real lead.` },
    { title: "Consultants", body: "Use a short, branded audit as the first thing you send a new lead, then follow with a proposal. A tracked link tells you whether it was opened before you follow up." },
  ],

  pricing: {
    intro: `Plans are charged in Indian rupees. Pro is ${FACTS.inr(FACTS.pro.monthly)} a month and Agency is ${FACTS.inr(FACTS.agency.monthly)} a month, or pay for a year and get two months free.`,
    flatSeats: `Plans are priced per workspace, not per person. Pro includes up to ${FACTS.pro.people} team members and Agency up to ${FACTS.agency.people} for the same monthly price, so adding a teammate does not raise the bill.`,
    counting: `An SEO audit report counts as one document. The scan itself is not an AI action. The optional plain-language explanation uses one AI action. Each workspace can run up to ${AUDITS_PER_HOUR} audits an hour.`,
  },

  comparison: {
    intro: `${PRODUCT_NAME} is not trying to be a full SEO platform. Here is how it differs from two tools agencies often compare it with.`,
    note: "Details about SEOptimer and SE Ranking come from their public product pages and independent reviews, and they change often. Check their sites for current features, plans and prices.",
    links: [["SEOptimer", "https://www.seoptimer.com/"], ["SE Ranking", "https://seranking.com/"]] as [string, string][],
    columns: [PRODUCT_NAME, "SEOptimer", "SE Ranking"],
    rows: [
      { topic: "Site audit", cells: ["A fast health check of the home page and a few inner pages. No full site crawl.", "Automated audit reports. Check their plans for crawl limits.", "A site audit with monthly page limits that depend on the plan."] },
      { topic: "White-label reports and embeddable audit form", cells: ["Not available. Reports use your logo, colors and fonts.", "Yes, on paid plans.", "White-label reporting is available."] },
      { topic: "Keyword research, rank tracking and backlink data", cells: ["No. The checklist leaves these for you to fill from your own tools.", "Check their site.", "Yes, a core part of the platform."] },
      { topic: "Proposals, quotations and invoices", cells: ["Yes, in the same workspace, with GST-ready quotations and invoices.", "Not the core product.", "Not the core product."] },
      { topic: "Pricing", cells: ["Indian rupees, per workspace, with team seats included.", "See their pricing page for current plans and currency.", "See their pricing page for current plans and currency."] },
    ],
    where: `If you need white-label reports, an embeddable audit form for your own website, deeper crawls, or rank tracking and backlink data, SEOptimer and SE Ranking are built for that and ${PRODUCT_NAME} is not. If you want to audit a lead, then send a proposal and a GST quotation in rupees from the same workspace, that is where ${PRODUCT_NAME} fits.`,
  },

  /** Page-specific questions. The shared ones (free plan, price) come from the FAQ bank in lib/content/faq.ts, so they match every other page. */
  faq: {
    first: [
      { q: "What should an SEO audit report include?", a: "A summary and overall score, findings grouped by area (technical, on-page, performance, content and so on), the priority of each finding, why it matters, the recommended fix, and clear next steps. A PrioDraft audit report includes all of these." },
      { q: "How long does it take to create an SEO audit report?", a: "The scan runs while you wait. After that, the time you spend is your own review: editing wording, adding screenshots and filling in the checklist points the scan could not answer." },
      { q: "Can I send the SEO audit report to my client?", a: "Yes. Download it as a PDF or share a private link. You can see when the link is opened and when the PDF is downloaded, and you can turn a link off at any time." },
    ],
    second: [
      { q: "Does the tool crawl the whole website?", a: `No. It reads the home page and up to ${AUDIT_EXTRA_PAGES} inner pages and checks a sample of up to ${AUDIT_LINK_CHECKS} links. That makes it a quick health check, not a full site crawl. For a deeper crawl, use a dedicated crawler and add what you find to the report as your own sections.` },
      { q: "Can I edit the report before I send it?", a: "Yes. Every piece of text can be changed, and you can add sections, attach screenshots and complete the audit checklist before the report reaches your client." },
      { q: "Can I turn an SEO audit into a proposal?", a: "Yes. The audit sits under the client's record, so you can start a proposal or a quotation for the same client in the same brand and write the brief from the audit's findings." },
    ],
  },
};

/** Every check name the page lists, flattened. */
export const AUDIT_LANDING_CHECKS: [string, string][] = AUDIT_LANDING.groups.flatMap((g) => g.checks);

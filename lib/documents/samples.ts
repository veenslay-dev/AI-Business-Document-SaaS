import type { ProposalAi } from "@/lib/ai/schemas";
import { buildBrandContext, type BrandContext } from "./branding";
import { analyze } from "@/lib/audit/analyze";
import { buildAuditContent } from "@/lib/audit/build";
import type { SiteSignals } from "@/lib/audit/types";
import { buildSocialAuditContent } from "@/lib/social/build";
import { buildProposalContent, buildInvoiceContent, buildQuotationContent } from "./builders";
import type { DocumentContent } from "./content";

/**
 * Demo content for Acme Digital. Used by the seed script, the marketing page examples
 * and tests. It never runs for real customer workspaces.
 */
export const ACME_BRAND: BrandContext = buildBrandContext(
  {
    company_name: "Acme Digital", tagline: "Search growth for local businesses", website: "https://acme-digital.example", email: "hello@acme-digital.example",
    phone: "+91 98765 43210", address: "12 Residency Road, Bengaluru 560025", gst_number: "29ABCDE1234F1Z5", pan_number: "ABCDE1234F",
    description: "Acme Digital is a small search and web team. We audit sites, fix what holds them back and run monthly SEO for local businesses.",
    services: ["Technical SEO audits", "Website design and development", "Monthly SEO retainers", "Content and local SEO"],
    default_terms: "1. Fees are billed monthly in advance and are due within 15 days.\n2. Work outside the agreed scope is quoted separately.\n3. Either party may end the retainer with 30 days written notice.",
    authorized_name: "Asha Rao", authorized_designation: "Founder", signature_url: null,
  },
  { primary_color: "#1f3a5f", secondary_color: "#e8eef6", accent_color: "#c8553d", heading_font: "Fraunces", body_font: "Inter", logo_url: null, dark_logo_url: null, favicon_url: null, default_footer: null },
);

export const SAMPLE_CLIENTS = [
  { company: "Nova Furniture", contact: "Rohan Mehta", email: "rohan@novafurniture.example", phone: "+91 98111 22334", address: "Plot 8, Peenya Industrial Area, Bengaluru", industry: "Furniture", website: "https://novafurniture.example" },
  { company: "Bright Dental", contact: "Dr. Kavya Nair", email: "kavya@brightdental.example", phone: "+91 98222 33445", address: "4 MG Road, Kochi", industry: "Healthcare", website: "https://brightdental.example" },
  { company: "Urban Properties", contact: "Imran Sheikh", email: "imran@urbanproperties.example", phone: "+91 98333 44556", address: "Bandra West, Mumbai", industry: "Real estate", website: "https://urbanproperties.example" },
];

export const SAMPLE_PROPOSAL_AI: ProposalAi = {
  title: "SEO growth plan for Nova Furniture",
  executive_summary: "Nova Furniture sells well in showrooms but gets few enquiries from search. This plan fixes the technical issues that hold the site back, rebuilds the category pages around what buyers search for, and reports on enquiries every month.",
  client_challenges: ["Category pages share duplicate titles, so they compete with each other.", "Product pages load slowly on mobile.", "Most organic traffic lands on the homepage, not on product categories."],
  objectives: ["Double organic enquiries within six months.", "Get the ten main category pages onto page one for their local search terms.", "Bring mobile page speed into the good range."],
  strategy: [
    { title: "Fix the foundations", description: "Resolve crawl errors, duplicate titles and slow templates in the first month so later work isn't wasted." },
    { title: "Rebuild category pages", description: "Rewrite each category page around real buyer searches, with clear product filters and internal links." },
    { title: "Report on enquiries", description: "A monthly one page report shows organic enquiries, ranking movement and what we are doing next." },
  ],
  deliverables: ["Technical SEO audit and fix list", "Rewritten titles and descriptions for 40 pages", "Ten rebuilt category pages", "Monthly performance report"],
  timeline: [
    { phase: "Audit and fixes", duration: "Weeks 1 to 4", description: "Full audit, then fix the highest impact issues." },
    { phase: "Category rebuild", duration: "Weeks 5 to 12", description: "Rewrite and relaunch category pages in batches of three." },
    { phase: "Growth and reporting", duration: "Month 4 onward", description: "Monthly content, link outreach and reporting." },
  ],
  investment: {
    currency: "INR",
    items: [{ name: "Technical audit and fixes (one time)", description: "", amount: 60000 }, { name: "Monthly SEO retainer", description: "Per month, minimum 6 months", amount: 85000 }],
    notes: "Prices exclude GST.",
  },
  terms: "",
};

export function sampleProposal(client = SAMPLE_CLIENTS[0]): DocumentContent {
  return buildProposalContent({
    brand: ACME_BRAND, ai: SAMPLE_PROPOSAL_AI, date: "2026-03-02",
    client: { company: client.company, contact: client.contact, email: client.email, phone: client.phone, address: client.address },
    input: { title: SAMPLE_PROPOSAL_AI.title, description: "Grow enquiries from search for a furniture manufacturer with a showroom.", goals: "", requirements: "", services: [], timeline: "", budget: "", notes: "", currency: "INR" },
    packages: [
      { name: "Starter", price: 50000, description: "Fixes and reporting", features: ["Technical audit", "Monthly report"] },
      { name: "Growth", price: 85000, description: "Fixes plus content", features: ["Everything in Starter", "4 pages a month", "Link outreach"], selected: true },
      { name: "Premium", price: 125000, description: "Full service", features: ["Everything in Growth", "8 pages a month", "Conversion work"] },
    ],
  });
}

export function sampleQuotation(client = SAMPLE_CLIENTS[1]): DocumentContent {
  return buildQuotationContent({
    brand: ACME_BRAND, client: { company: client.company, contact: client.contact, email: client.email, phone: client.phone, address: client.address },
    number: "QT-2026-0001", issueDate: "2026-03-05", validUntil: "2026-04-04", currency: "INR", taxLabel: "GST", taxRate: 18,
    title: "Website relaunch quotation", notes: "50% payable at kickoff, 50% on launch.",
    scope: {
      overview: "Bright Dental needs a faster, clearer website that helps new patients find the clinic and book online.",
      scope: ["Design five key pages: home, services, about, team and contact", "Build on a CMS the front desk can edit", "Set up online booking and a Google Business Profile"],
      deliverables: ["Live responsive website", "Design source files", "One training session for the team"],
      timeline: "8 weeks from kickoff",
    },
    items: [
      { kind: "section", id: "g1", title: "Design" },
      { kind: "item", id: "i1", name: "Website design", description: "Home, services, about, contact and four treatment pages", quantity: 1, unit: "", unitPrice: 75000, discountType: "percent", discount: 0, taxRate: null },
      { kind: "section", id: "g2", title: "Build" },
      { kind: "item", id: "i2", name: "Development and CMS setup", description: "Responsive build with an editable CMS", quantity: 1, unit: "", unitPrice: 90000, discountType: "percent", discount: 10, taxRate: null },
      { kind: "item", id: "i3", name: "Local SEO setup", description: "Google Business Profile, schema and citations", quantity: 1, unit: "", unitPrice: 25000, discountType: "percent", discount: 0, taxRate: null },
    ],
  });
}

const SAMPLE_MARKETING_AI: ProposalAi = {
  title: "Digital marketing plan for Urban Properties",
  executive_summary: "Urban Properties lists new apartments every quarter but depends almost entirely on brokers and walk-ins for leads. This plan builds a steady flow of direct enquiries by combining local search, Google Ads for launch periods, Instagram content from the sites and a monthly email to past enquirers. Every channel is reported in one monthly summary, so you can see which spend produced site visits.",
  client_challenges: ["Project pages rank for the project name only, not for what buyers search, such as 2 BHK in Bandra West.", "Paid campaigns were run for one launch with no tracking of calls or form fills.", "The Instagram page posts renders only, with no walkthroughs, site progress or buyer questions.", "Past enquirers are never contacted again once a project sells out."],
  objectives: ["Set up tracking so every enquiry is traced to its source within the first month.", "Bring the cost of a qualified enquiry down against the current broker commission.", "Publish three Instagram posts a week with at least one video.", "Send one email a month to everyone who has enquired before."],
  strategy: [
    { title: "Search and local presence", description: "Fix project page titles and content, set up a Google Business Profile for each sales office, and publish area guides that answer what buyers ask." },
    { title: "Launch advertising", description: "Run Google Search and Meta lead campaigns around each launch, with dedicated landing pages and call tracking, and pause them when a phase sells out." },
    { title: "Social media", description: "A content calendar built on site walkthroughs, construction progress, buyer FAQs and customer stories, with replies to comments and messages within one working day." },
    { title: "Email and follow-up", description: "A monthly newsletter and a short follow-up sequence for new enquirers, so interest does not go cold between calls." },
  ],
  deliverables: ["Tracking setup for calls, forms and WhatsApp clicks", "Rewritten titles and descriptions for all project pages", "Google and Meta campaigns for each launch", "12 social posts per month, including 4 videos", "One email newsletter per month", "Monthly report with a call to review it"],
  timeline: [
    { phase: "Setup", duration: "Weeks 1 to 3", description: "Tracking, accounts, audit of current pages and a content calendar for the first quarter." },
    { phase: "Launch", duration: "Weeks 4 to 8", description: "Search fixes go live, first campaigns start and the posting schedule begins." },
    { phase: "Optimise", duration: "Month 3 onward", description: "Shift budget to what is producing enquiries and report on it every month." },
  ],
  investment: {
    currency: "INR",
    items: [{ name: "Setup and tracking (one time)", description: "", amount: 35000 }, { name: "Monthly management", description: "SEO, social, email and reporting", amount: 70000 }, { name: "Ad campaign management", description: "Per month while campaigns run, excludes ad spend", amount: 20000 }],
    notes: "Ad spend is paid directly to Google and Meta from the client's own account and is not included. Prices exclude GST.",
  },
  terms: "",
};

export function sampleMarketingProposal(client = SAMPLE_CLIENTS[2]): DocumentContent {
  return buildProposalContent({
    brand: ACME_BRAND, ai: SAMPLE_MARKETING_AI, date: "2026-03-09",
    client: { company: client.company, contact: client.contact, email: client.email, phone: client.phone, address: client.address },
    input: { title: SAMPLE_MARKETING_AI.title, description: "A multi-channel marketing plan for a real estate developer with quarterly launches.", goals: "", requirements: "", services: [], timeline: "", budget: "", notes: "", currency: "INR" },
    packages: [
      { name: "Essentials", price: 55000, description: "Search and social", features: ["Local SEO and Google Business Profile", "8 social posts a month", "Monthly report"] },
      { name: "Launch", price: 90000, description: "Everything for a project launch", features: ["Everything in Essentials", "Google and Meta campaign management", "Landing pages", "Monthly email"], selected: true },
      { name: "Full service", price: 140000, description: "Always on across channels", features: ["Everything in Launch", "12 social posts and 4 videos", "Email follow-up sequences", "Fortnightly review calls"] },
    ],
  });
}

/** A plain invoice with no tax and no discount, so the tax and discount columns stay hidden. */
export function sampleInvoice(client = SAMPLE_CLIENTS[1], withTax = false): DocumentContent {
  return buildInvoiceContent({
    brand: ACME_BRAND, client: { company: client.company, contact: client.contact, email: client.email, phone: client.phone, address: client.address },
    number: "INV-2026-0001", issueDate: "2026-04-02", dueDate: "2026-04-17", currency: "INR", taxLabel: "GST", taxRate: withTax ? 18 : 0,
    title: "Invoice for March SEO retainer", paymentDetails: "Bank: Example Bank\nAccount: 0000 1111 2222\nIFSC: EXMP0000123\nUPI: acme@examplebank",
    items: [
      { kind: "item", id: "i1", name: "SEO retainer, March", description: "On-page fixes, content and reporting", quantity: 1, unit: "", unitPrice: 45000, discountType: "percent", discount: 0, taxRate: null },
      { kind: "item", id: "i2", name: "Local citations", description: "20 directory listings", quantity: 1, unit: "", unitPrice: 8000, discountType: "percent", discount: 0, taxRate: null },
    ],
  });
}

/** A second brand, used on the marketing page to show the same content in a different company's look. */
export const HARBOR_BRAND: BrandContext = buildBrandContext(
  {
    company_name: "Harbor Studio", tagline: "Brand and web design", website: "https://harborstudio.example", email: "studio@harborstudio.example", phone: "+44 20 7946 0000",
    address: "8 Wharf Lane, Bristol BS1 4XY", gst_number: null, pan_number: null, description: "Harbor Studio designs brands and websites for independent shops and restaurants.",
    services: ["Brand identity", "Website design", "Photography direction"], default_terms: "Payment is due within 14 days of invoice.", authorized_name: "Tom Ellis", authorized_designation: "Director", signature_url: null,
  },
  { primary_color: "#0f5c4d", secondary_color: "#e3f1ed", accent_color: "#d98a1f", heading_font: "Playfair Display", body_font: "DM Sans", logo_url: null, dark_logo_url: null, favicon_url: null, default_footer: null },
);

const auditPage = (over: Partial<import("@/lib/audit/types").PageSignals> = {}) => ({
  url: "https://novafurniture.example/", status: 200, finalUrl: "https://novafurniture.example/", redirects: 0, contentType: "text/html", bytes: 84_000, ms: 1900,
  title: "Nova Furniture", metaDescription: "", canonical: "", robotsMeta: "", xRobots: "", h1: ["Furniture made in Bengaluru"], h2: [], imgTotal: 24, imgMissingAlt: 17, wordCount: 240,
  hasViewport: true, lang: "en", jsonLdTypes: [], jsonLdErrors: 0, internalLinks: [], externalLinkCount: 4, isHttps: true, hsts: false, blogLink: false, ...over,
});
export const SAMPLE_SIGNALS: SiteSignals = {
  origin: "https://novafurniture.example", scannedAt: "2026-03-10T09:00:00.000Z", home: auditPage(),
  pages: [auditPage({ url: "https://novafurniture.example/sofas", finalUrl: "https://novafurniture.example/sofas", title: "Nova Furniture", wordCount: 120 })],
  robots: { status: 200, blocksAll: false, sitemapUrls: [] }, sitemap: { found: false, urlCount: 0 },
  brokenLinks: [{ url: "https://novafurniture.example/old-catalogue", status: 404 }], httpToHttps: true, psi: { score: 46, lcp: 4600, cls: 0.12, tbt: 380 },
};

export function sampleAudit(client = SAMPLE_CLIENTS[0]): DocumentContent {
  const content = buildAuditContent({
    brand: ACME_BRAND, client: { company: client.company, contact: client.contact, email: client.email, phone: client.phone, address: client.address },
    url: "https://novafurniture.example", findings: analyze(SAMPLE_SIGNALS), scannedAt: SAMPLE_SIGNALS.scannedAt,
  });
  content.cover.title = "SEO Audit: novafurniture.example";
  return content;
}

/** PrioDraft's own brand, for the audit of our own website that the SEO Audit Report Generator page shows. */
export function priodraftBrand(site: string, email: string | null): BrandContext {
  return buildBrandContext(
    {
      company_name: "PrioDraft", tagline: "Branded proposals, quotations and audits", website: site, email, phone: null, address: null, gst_number: null, pan_number: null,
      description: null, services: [], default_terms: null, authorized_name: null, authorized_designation: null, signature_url: null,
    },
    { primary_color: "#dc1c26", secondary_color: "#fdecee", accent_color: "#dc1c26", heading_font: "Plus Jakarta Sans", body_font: "Plus Jakarta Sans", logo_url: null, dark_logo_url: null, favicon_url: null, default_footer: null },
  );
}

/** The report for an audit of our own site: PrioDraft is both the author and the client, so no made-up company appears. */
export function ownSiteAudit(signals: SiteSignals, scannedAt: string, url: string, brand: BrandContext): DocumentContent {
  const host = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const content = buildAuditContent({
    brand, client: { company: "PrioDraft", contact: "", email: "", phone: "", address: "" }, url, findings: analyze(signals), scannedAt,
  });
  content.cover.title = `SEO Audit: ${host}`;
  return content;
}

/** A partly completed social media audit, the way an auditor would leave it mid-review. */
export function sampleSocialAudit(client = SAMPLE_CLIENTS[1]): DocumentContent {
  const c = buildSocialAuditContent({
    brand: ACME_BRAND, date: "2026-03-12",
    client: { company: client.company, contact: client.contact, email: client.email, phone: client.phone, address: client.address },
    accounts: [{ platform: "instagram", handle: "@brightdental", url: "https://instagram.com/brightdental" }, { platform: "facebook", handle: "Bright Dental Kochi", url: "https://facebook.com/brightdental" }],
    sectionKeys: ["profile-branding", "content-strategy", "engagement-community", "instagram", "facebook"],
  });
  // [item index, status, observation, recommendation, priority]
  const fill: Record<string, [number, "good" | "needs_work" | "poor" | "na", string, string, "high" | "medium" | "low" | ""][]> = {
    "Profiles and branding": [
      [0, "good", "Same handle and logo on both accounts.", "", ""],
      [2, "needs_work", "Bio lists services but not the city or a booking number.", "Add the city, hours and a booking link to the bio.", "high"],
      [4, "poor", "Link in bio goes to the old website homepage.", "Point it to the booking page and add UTM tags.", "high"],
    ],
    "Content strategy": [
      [1, "needs_work", "Posts appear in bursts, then nothing for two weeks.", "Plan three posts a week on a calendar.", "medium"],
      [2, "poor", "Almost all posts are static images.", "Add Reels showing procedures, team intros and patient tips.", "high"],
    ],
    "Engagement and community": [[0, "good", "Comments are answered the same day.", "", ""], [6, "na", "", "", ""]],
  };
  for (const sec of c.sections) {
    const rows = fill[sec.title];
    if (!rows) continue;
    const list = sec.blocks.find((b) => b.type === "checklist");
    if (list?.type !== "checklist") continue;
    for (const [i, status, note, recommendation, priority] of rows) if (list.items[i]) Object.assign(list.items[i], { status, note, recommendation, priority });
  }
  const found = c.sections.find((s) => s.title === "Key findings and recommendations")?.blocks[0];
  if (found?.type === "audit_findings") found.findings.push({ id: "f-custom-1", issue: "Google reviews are not linked from social profiles", severity: "medium", explanation: "The clinic has strong reviews on Google but none of the social profiles mention or link to them.", recommendation: "Add a review highlight on Instagram and pin a review post on Facebook.", affectedUrl: "Instagram, Facebook", status: "open" });
  return c;
}

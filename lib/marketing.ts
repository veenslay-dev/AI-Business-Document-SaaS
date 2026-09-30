/** Copy for the public site. Prices for paid plans are intentionally not invented here; set `price` when they're decided. */
export type PlanCard = { id: "free" | "professional" | "agency"; name: string; price: string; note: string; blurb: string; features: string[]; cta: string; highlight?: boolean };

export const PLAN_CARDS: PlanCard[] = [
  { id: "free", name: "Free", price: "0", note: "No card needed", blurb: "Try the whole flow with a real client.", cta: "Start Free",
    features: ["3 documents per month", "1 workspace", "Basic templates", "PDF export"] },
  { id: "professional", name: "Professional", price: "Coming soon", note: "Price announced at launch", blurb: "For a freelancer or small studio that sends documents every week.", cta: "Start Free", highlight: true,
    features: ["Unlimited documents", "AI generation", "Custom branding", "Shareable documents", "Proposal tracking", "More templates"] },
  { id: "agency", name: "Agency", price: "Coming soon", note: "Price announced at launch", blurb: "For teams that need everyone writing in the same brand.", cta: "Start Free",
    features: ["Multiple team members", "White-label documents", "Advanced templates", "Client management", "Audit generation", "Advanced tracking"] },
];

export const FAQ: { q: string; a: string }[] = [
  { q: "Do I need design skills?", a: "No. You choose colors, fonts and upload a logo once, and the templates handle layout, spacing and page breaks. You can still edit every section by hand." },
  { q: "Will the AI make things up?", a: "It is told to use only your company profile, services and knowledge base entries, and to leave out facts it doesn't have. It can still get things wrong, so every draft is editable and nothing is sent until you share it." },
  { q: "What happens to sent documents if I change my brand or phone number?", a: "New documents use your latest brand kit and details. When you share a document, its branding is saved with it, so documents you already sent keep the look and contact details they had." },
  { q: "Can clients sign?", a: "Clients can accept a proposal or quotation online by entering their name and email, agreeing to the terms and drawing or typing a signature. We record who accepted and when. Whether that is enough for your contracts depends on your jurisdiction, so check with a lawyer for anything high stakes." },
  { q: "What does the SEO audit check?", a: "HTTPS, indexability, robots.txt, sitemap, canonical tags, redirects, a sample of internal links, titles, descriptions, headings, image alt text, content length, structured data, server speed and, when available, Google PageSpeed results. It reads the home page and a handful of inner pages, so it is a fast health check rather than a full crawl." },
  { q: "Who can see my data?", a: "Only members of your workspace. Data lives in a Postgres database with row level security, so one company's records are never returned to another. Shared documents are reachable only through their private link." },
  { q: "Can I take payments through it?", a: "Not yet. Paid plans and invoicing are planned. Today the product covers proposals, quotations and audits." },
];

export const FEATURES = [
  { title: "One company profile", body: "Company details, logo, colors, fonts, terms and signature live in one place. Nobody retypes a phone number into a proposal again." },
  { title: "AI that knows your business", body: "Drafts come back as structured sections, not one wall of text. Rewrite, shorten, simplify or generate a timeline for any part." },
  { title: "Quotations that add up", body: "Line items, discounts, configurable tax and four currencies, calculated in whole paise and cents so totals never drift." },
  { title: "SEO audits as reports", body: "Scan a site, get scored findings with plain-language explanations and a fix for each, in your branding." },
  { title: "PDFs and share links", body: "The same document becomes a PDF with page numbers or a private web link. Nothing is designed twice." },
  { title: "Know what the client did", body: "See when a link was opened, download activity, and whether they accepted, declined or asked for changes." },
];

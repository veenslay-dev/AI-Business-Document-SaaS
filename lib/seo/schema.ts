import { PRODUCT_NAME } from "@/components/ui/logo";
import { PLANS, YEARLY_MONTHS, type PlanId } from "@/lib/billing/plans";
import { FAQ } from "@/lib/marketing";
import { LEGAL_UPDATED_ISO } from "@/lib/legal";
import { PAGE_BY_PATH } from "./registry";
import { TEMPLATE_BY_PATH, TEMPLATE_PAGES } from "./templates";

type Json = Record<string, unknown>;
export type SchemaOverride = { seo_title?: string | null; seo_description?: string | null; canonical?: string | null; schema_json?: string | null; updated_at?: string | null } | null;

const abs = (base: string, pathOrUrl: string) => { try { return new URL(pathOrUrl, base).toString(); } catch { return base + pathOrUrl; } };
const trimmed = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

/** Parses the admin's custom JSON-LD. Returns the nodes to add, or an error message for the form. */
export function parseCustomSchema(src: string | null | undefined): { nodes: Json[]; error?: string } {
  const text = trimmed(src);
  if (!text) return { nodes: [] };
  if (text.length > 20_000) return { nodes: [], error: "The custom schema is too long (20,000 characters at most)." };
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { nodes: [], error: "The custom schema is not valid JSON." }; }
  const list = Array.isArray(data) ? data : data && typeof data === "object" && Array.isArray((data as Json)["@graph"]) ? ((data as Json)["@graph"] as unknown[]) : [data];
  const nodes = list.filter((n): n is Json => !!n && typeof n === "object" && !Array.isArray(n) && typeof (n as Json)["@type"] !== "undefined");
  if (!nodes.length) return { nodes: [], error: 'Each schema item needs an "@type", for example {"@type": "Event", ...}.' };
  return { nodes: nodes.map((n) => { const { ["@context"]: _ctx, ...rest } = n; void _ctx; return rest; }) };
}

function planOffers(base: string): Json[] {
  return (["free", "professional", "agency"] as PlanId[]).map((id) => ({
    "@type": "Offer", name: `${PRODUCT_NAME} ${PLANS[id].name}`, price: PLANS[id].priceInr ?? 0, priceCurrency: "INR",
    availability: "https://schema.org/InStock", url: `${base}/pricing`,
    ...(id !== "free" ? { priceSpecification: { "@type": "UnitPriceSpecification", price: PLANS[id].priceInr, priceCurrency: "INR", unitText: "MONTH", referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" } } } : {}),
  }));
}

/**
 * The JSON-LD for a public page, built from the page's real content and settings. Every page gets a WebPage and a breadcrumb;
 * the home page adds Organization, WebSite, SoftwareApplication and the visible FAQ; Pricing adds a Product with an Offer per plan;
 * About and Contact use their own page types. Nothing here is invented: no ratings or reviews, and the FAQ is only added where it shows on the page.
 */
export function buildPageSchema(path: string, o: SchemaOverride, base: string, opts: { contactEmail?: string; legalName?: string } = {}): Json {
  const def = PAGE_BY_PATH[path];
  const name = trimmed(o?.seo_title) ?? (def.absoluteTitle ? def.title : `${def.title} | ${PRODUCT_NAME}`);
  const description = trimmed(o?.seo_description) ?? def.description;
  const url = abs(base, trimmed(o?.canonical) ?? path);
  const orgId = `${base}/#organization`, siteId = `${base}/#website`, pageId = `${url}#webpage`;
  const modified = def.kind === "legal" ? LEGAL_UPDATED_ISO : trimmed(o?.updated_at)?.slice(0, 10);

  const graph: Json[] = [];
  graph.push({
    "@type": "Organization", "@id": orgId, name: PRODUCT_NAME, url: `${base}/`,
    ...(opts.legalName && opts.legalName !== PRODUCT_NAME ? { legalName: opts.legalName } : {}),
    logo: { "@type": "ImageObject", url: `${base}/logo.png` },
    contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", url: `${base}/contact`, availableLanguage: ["English"], ...(opts.contactEmail ? { email: opts.contactEmail } : {}) }],
  });
  graph.push({ "@type": "WebSite", "@id": siteId, url: `${base}/`, name: PRODUCT_NAME, inLanguage: "en-IN", publisher: { "@id": orgId } });

  const pageType = def.kind === "about" ? "AboutPage" : def.kind === "contact" ? "ContactPage" : def.kind === "templates" ? "CollectionPage" : "WebPage";
  graph.push({
    "@type": pageType, "@id": pageId, url, name, description, inLanguage: "en-IN", isPartOf: { "@id": siteId }, publisher: { "@id": orgId },
    ...(modified ? { dateModified: modified } : {}),
    ...(path !== "/" ? { breadcrumb: { "@id": `${url}#breadcrumb` } } : { about: { "@id": `${base}/#software` } }),
    ...(def.kind === "about" || def.kind === "contact" ? { mainEntity: { "@id": orgId } } : {}),
    potentialAction: [{ "@type": "ReadAction", target: [url] }],
  });
  if (path !== "/") {
    const parent = def.parent ? PAGE_BY_PATH[def.parent] : null;
    const trail = [{ name: "Home", item: `${base}/` }, ...(parent ? [{ name: parent.name, item: abs(base, parent.path) }] : []), { name: def.name, item: url }];
    graph.push({ "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`, itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: t.item })) });
  }
  if (def.kind === "templates") {
    graph.push({ "@type": "ItemList", "@id": `${url}#list`, name: "Document templates", itemListElement: TEMPLATE_PAGES.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, url: abs(base, t.path) })) });
  }
  const tpl = TEMPLATE_BY_PATH[path];
  if (def.kind === "template" && tpl) {
    // Both the questions and the steps are shown on the page, which is what search engines require of this markup.
    graph.push({ "@type": "FAQPage", "@id": `${url}#faq`, mainEntity: tpl.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
    graph.push({ "@type": "HowTo", "@id": `${url}#howto`, name: `How to use the ${tpl.name.toLowerCase()}`, step: tpl.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.title, text: s.body })) });
  }

  if (def.kind === "home") {
    graph.push({
      "@type": "SoftwareApplication", "@id": `${base}/#software`, name: PRODUCT_NAME, url: `${base}/`, applicationCategory: "BusinessApplication", operatingSystem: "Web",
      description: "Branded proposals, quotations, invoices and SEO audit reports generated with AI from a one-time company profile.",
      offers: planOffers(base), publisher: { "@id": orgId },
    });
    graph.push({ "@type": "FAQPage", "@id": `${url}#faq`, mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
  }
  if (def.kind === "pricing") {
    for (const id of ["free", "professional", "agency"] as PlanId[]) {
      const p = PLANS[id];
      graph.push({
        "@type": "Product", "@id": `${base}/pricing#${id}`, name: `${PRODUCT_NAME} ${p.name} plan`, brand: { "@id": orgId },
        description: `${p.monthlyDocuments === null ? "Unlimited" : p.monthlyDocuments} documents and ${p.aiPerMonth} AI actions per month, ${p.teamMembers === null ? "unlimited" : p.teamMembers} team member${p.teamMembers === 1 ? "" : "s"}.`,
        offers: [
          { "@type": "Offer", price: p.priceInr ?? 0, priceCurrency: "INR", availability: "https://schema.org/InStock", url: `${base}/pricing`, name: "Monthly" },
          ...(p.priceInr ? [{ "@type": "Offer", price: p.priceInr * YEARLY_MONTHS, priceCurrency: "INR", availability: "https://schema.org/InStock", url: `${base}/pricing`, name: "Yearly (2 months free)" }] : []),
        ],
      });
    }
  }

  const custom = parseCustomSchema(o?.schema_json);
  graph.push(...custom.nodes);
  return { "@context": "https://schema.org", "@graph": graph };
}

/** Safe to place inside a script tag: "<" can never close it. */
export const serializeJsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c").replace(/[\u2028\u2029]/g, "");

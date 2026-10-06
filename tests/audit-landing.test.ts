import { describe, expect, it } from "vitest";
import { analyze } from "@/lib/audit/analyze";
import { AUDIT_EXTRA_PAGES, AUDIT_LINK_CHECKS, AUDITS_PER_HOUR } from "@/lib/audit/limits";
import { SAMPLE_SIGNALS } from "@/lib/documents/samples";
import { AUDIT_LANDING as L, AUDIT_LANDING_CHECKS } from "@/lib/seo/audit-landing";
import { faqFor } from "@/lib/content/faq";
import { PAGE_BY_PATH } from "@/lib/seo/registry";
import { templateMenu } from "@/lib/seo/menu";
import { buildPageSchema } from "@/lib/seo/schema";
import { ownSiteAudit, priodraftBrand } from "@/lib/documents/samples";

/** Signals with every optional field set, so the scanner produces every check it can. */
const full = { ...SAMPLE_SIGNALS, notFound: { status: 404, custom: true }, variants: [{ url: "http://x.test", final: "https://x.test/" }],
  home: { ...SAMPLE_SIGNALS.home, hasFavicon: true, openGraph: true, twitterCard: true, analytics: ["Google Analytics 4"], searchConsoleVerified: true, mixedContent: 0, lazyImages: 3, headingSkips: 0, urlLength: 20, urlHasParams: false, securityHeaders: ["hsts"] } };
const findings = analyze(full);

describe("SEO Audit Report Generator page", () => {
  it("uses the title, description and URL it was briefed with", () => {
    const def = PAGE_BY_PATH["/seo-audit-report-generator"];
    expect(def.title).toBe("SEO Audit Report Generator for Agencies and Freelancers");
    expect(def.absoluteTitle).toBe(true);
    expect(def.description).toBe("Generate a branded SEO audit report for your client or lead, share it as a tracked link, and turn it into a proposal. INR pricing, flat seats.");
    expect(L.h1).toBe(def.title);
  });
  it("lists only checks the scanner really runs, with the names the report uses, and misses none", () => {
    const byId = new Map(findings.map((f) => [f.id, f.issue]));
    for (const [id, name] of AUDIT_LANDING_CHECKS) { expect(byId.has(id), `${id} is not a real check`).toBe(true); expect(byId.get(id), id).toBe(name); }
    const listed = new Set(AUDIT_LANDING_CHECKS.map(([id]) => id));
    for (const f of findings) expect(listed.has(f.id), `the scanner runs "${f.id}" but the page does not list it`).toBe(true);
  });
  it("states the scan limits from the scanner's own constants", () => {
    expect(L.scope).toContain(`${AUDIT_EXTRA_PAGES} inner pages`); expect(L.scope).toContain(`${AUDIT_LINK_CHECKS} links`);
    expect(L.pricing.counting).toContain(`${AUDITS_PER_HOUR} audits an hour`);
    expect(L.steps.map((s) => s.body).join(" ")).toContain(`${AUDIT_EXTRA_PAGES} inner pages`);
  });
  it("never claims a full crawl, white label or reseller features, or fake clients", () => {
    const text = JSON.stringify(L).replace(L.comparison.rows.map((r) => JSON.stringify(r)).join(""), "");
    const own = JSON.stringify({ ...L, comparison: undefined });
    expect(own).not.toMatch(/reseller|resell |agency white|complete (site )?audit|entire site|every page of your site/i);
    expect(own.replace(/(not|no)[^.]*white-?label[^.]*\./gi, "")).not.toMatch(/white[- ]?label/i);
    expect(own.replace(/not a full site crawl|not crawl the whole site|does not crawl the whole site|no full site crawl|Does the tool crawl the whole website\?/gi, "")).not.toMatch(/full (site )?crawl|whole (site|website) is crawled|crawls the whole/i);
    expect(text).not.toMatch(/Nova Furniture|Acme|Bright Dental|Urban Properties|Harbor/);
    expect(JSON.stringify(L)).not.toContain("—");
  });
  it("shows no competitor prices, which change and were not verified", () => {
    expect(JSON.stringify(L.comparison)).not.toMatch(/\$\s?\d|USD|US\$|per month/i);
  });
  it("has FAQ questions that become FAQ schema, with a breadcrumb, HowTo and software markup", () => {
    const faq = faqFor(L.path);
    expect(faq.length).toBeGreaterThanOrEqual(6); expect(faq.length).toBeLessThanOrEqual(8);
    const g = (buildPageSchema(L.path, null, "https://www.priodraft.com") as { "@graph": { "@type": string; mainEntity?: unknown[]; step?: unknown[] }[] })["@graph"];
    expect(g.find((n) => n["@type"] === "FAQPage")?.mainEntity).toHaveLength(faq.length);
    expect(g.find((n) => n["@type"] === "HowTo")?.step).toHaveLength(L.steps.length);
    expect(g.map((n) => n["@type"])).toEqual(expect.arrayContaining(["BreadcrumbList", "SoftwareApplication", "WebPage"]));
  });
  it("is in the Templates menu next to the SEO proposal", () => {
    const m = templateMenu(); expect(m[1]).toEqual({ name: "SEO Audit Report Generator", path: "/seo-audit-report-generator" }); expect(m).toHaveLength(6);
  });
  it("builds the own-site report with PrioDraft as author and client, so no made-up company appears", () => {
    const brand = priodraftBrand("https://www.priodraft.com", "hello@priodraft.com");
    const doc = ownSiteAudit(full, "2026-10-06T10:00:00.000Z", "https://www.priodraft.com", brand);
    expect(doc.cover.title).toBe("SEO Audit: www.priodraft.com"); expect(doc.cover.preparedFor).toBe("PrioDraft"); expect(doc.cover.preparedBy).toBe("PrioDraft");
    expect(JSON.stringify(doc)).not.toMatch(/Nova Furniture|Acme/);
  });
});

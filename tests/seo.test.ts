import { describe, expect, it } from "vitest";
import { PAGES, PAGE_BY_PATH } from "@/lib/seo/registry";
import { buildPageSchema, parseCustomSchema, serializeJsonLd } from "@/lib/seo/schema";
import { parseMarkdown, safeHref } from "@/lib/seo/markdown";
import { PLANS } from "@/lib/billing/plans";
import { TEMPLATE_HUB, TEMPLATE_PAGES } from "@/lib/seo/templates";

const BASE = "https://www.priodraft.com";
type Node = Record<string, unknown>;
const graph = (path: string, o = null as Parameters<typeof buildPageSchema>[1]) => (buildPageSchema(path, o, BASE) as { "@graph": Node[] })["@graph"];
const types = (g: Node[]) => g.map((n) => n["@type"]);

describe("page registry", () => {
  it("has unique paths and a title and description for every page", () => {
    expect(new Set(PAGES.map((p) => p.path)).size).toBe(PAGES.length);
    for (const p of PAGES) { expect(p.title.length).toBeGreaterThan(2); expect(p.description.length).toBeGreaterThan(20); expect(p.path.startsWith("/")).toBe(true); }
  });
});

describe("schema markup", () => {
  it("every page gets a WebPage-type node, an organization and a site", () => {
    for (const p of PAGES) {
      const t = types(graph(p.path));
      expect(t).toContain("Organization"); expect(t).toContain("WebSite");
      expect(t.some((x) => ["WebPage", "AboutPage", "ContactPage", "CollectionPage"].includes(x as string))).toBe(true);
    }
  });
  it("uses the right page type and breadcrumbs", () => {
    expect(types(graph("/about"))).toContain("AboutPage");
    expect(types(graph("/contact"))).toContain("ContactPage");
    expect(types(graph("/terms"))).toContain("BreadcrumbList");
    expect(types(graph("/"))).not.toContain("BreadcrumbList");
  });
  it("home has the app, the FAQ, and never invents ratings or reviews", () => {
    const g = graph("/"); expect(types(g)).toEqual(expect.arrayContaining(["SoftwareApplication", "FAQPage"]));
    const json = JSON.stringify(g); expect(json).not.toMatch(/aggregateRating|"review"|ratingValue/);
  });
  it("pricing offers come from the live plan table, in rupees", () => {
    const products = graph("/pricing").filter((n) => n["@type"] === "Product");
    expect(products).toHaveLength(3);
    const pro = products.find((n) => String(n.name).includes("Pro")) as { offers: { price: number; priceCurrency: string }[] };
    expect(pro.offers[0]).toMatchObject({ price: PLANS.professional.priceInr, priceCurrency: "INR" });
    expect(pro.offers[1].price).toBe((PLANS.professional.priceInr ?? 0) * 10);
  });
  it("uses the admin's title, description and canonical", () => {
    const g = graph("/about", { seo_title: "Custom title", seo_description: "Custom description here", canonical: "/about-us" });
    const page = g.find((n) => n["@type"] === "AboutPage")!;
    expect(page).toMatchObject({ name: "Custom title", description: "Custom description here", url: `${BASE}/about-us` });
  });
  it("legal pages carry the policy date", () => { expect(graph("/privacy").find((n) => n["@type"] === "WebPage")).toHaveProperty("dateModified"); });
  it("adds valid custom schema and drops its @context", () => {
    const g = graph("/pricing", { schema_json: '{"@context":"https://schema.org","@type":"Event","name":"Webinar"}' });
    expect(g[g.length - 1]).toEqual({ "@type": "Event", name: "Webinar" });
  });
  it("rejects broken or typeless custom schema", () => {
    expect(parseCustomSchema("{nope").error).toMatch(/valid JSON/);
    expect(parseCustomSchema('{"name":"x"}').error).toMatch(/@type/);
    expect(parseCustomSchema("").nodes).toEqual([]);
    expect(parseCustomSchema('{"@graph":[{"@type":"Thing"},{"@type":"Event"}]}').nodes).toHaveLength(2);
  });
  it("cannot break out of the script tag", () => {
    expect(serializeJsonLd({ a: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
  it("noindex pages are known", () => { expect(PAGE_BY_PATH["/login"].noindex).toBe(true); expect(PAGE_BY_PATH["/about"].noindex).toBeFalsy(); });
});

describe("template pages", () => {
  it("are registered under the Templates hub and listed in its ItemList", () => {
    expect(PAGE_BY_PATH["/document-templates"].kind).toBe("templates");
    for (const t of TEMPLATE_PAGES) expect(PAGE_BY_PATH[t.path]).toMatchObject({ kind: "template", parent: "/document-templates" });
    const list = graph("/document-templates").find((n) => n["@type"] === "ItemList") as { itemListElement: unknown[] };
    expect(list.itemListElement).toHaveLength(TEMPLATE_PAGES.length);
  });
  it("each template page has a three step breadcrumb, a FAQ and a HowTo that match what is shown", () => {
    for (const t of TEMPLATE_PAGES) {
      const g = graph(t.path);
      const crumbs = g.find((n) => n["@type"] === "BreadcrumbList") as { itemListElement: { name: string }[] };
      expect(crumbs.itemListElement.map((c) => c.name)).toEqual(["Home", "Templates", t.name]);
      const faq = g.find((n) => n["@type"] === "FAQPage") as { mainEntity: unknown[] };
      expect(faq.mainEntity).toHaveLength(t.faq.length);
      const how = g.find((n) => n["@type"] === "HowTo") as { step: unknown[] };
      expect(how.step).toHaveLength(t.steps.length);
    }
  });
  it("the copy follows the house rules", () => {
    const text = JSON.stringify(TEMPLATE_PAGES) + JSON.stringify(TEMPLATE_HUB);
    expect(text).not.toContain("\u2014");
    for (const t of TEMPLATE_PAGES) { expect(t.faq.length).toBeGreaterThanOrEqual(3); expect(t.includes.length).toBeGreaterThanOrEqual(6); expect(t.description.length).toBeLessThanOrEqual(200); }
  });
});

describe("extra content markdown", () => {
  it("reads headings, lists and paragraphs", () => {
    const b = parseMarkdown("## Hello\n\nSome **bold** text\nsecond line\n\n- one\n- two\n\n1. first\n2. second");
    expect(b.map((x) => x.t)).toEqual(["h2", "p", "ul", "ol"]);
    expect(b[1]).toEqual({ t: "p", text: "Some **bold** text second line" });
  });
  it("only lets safe links through", () => {
    expect(safeHref("/contact")).toBe("/contact"); expect(safeHref("https://example.com/a")).toBe("https://example.com/a");
    expect(safeHref("mailto:a@b.co")).toBe("mailto:a@b.co");
    for (const bad of ["javascript:alert(1)", "//evil.com", "http://insecure.test", "data:text/html,x", " javascript:x"]) expect(safeHref(bad)).toBeNull();
  });
});

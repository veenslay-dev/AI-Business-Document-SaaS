import { describe, expect, it } from "vitest";
import { NOINDEX_HEADER, NOINDEX_META, PRIVATE_PREFIXES, ROBOTS_DISALLOW } from "@/lib/seo/robots";
import { PAGES } from "@/lib/seo/registry";

describe("indexing rules", () => {
  it("the header and the page metadata agree", () => {
    for (const d of ["noindex", "nofollow", "noarchive", "nosnippet", "noimageindex"]) expect(NOINDEX_HEADER).toContain(d);
    expect(NOINDEX_META).toMatchObject({ index: false, follow: false, noarchive: true, nosnippet: true });
  });
  it("covers generated links, the API, PDFs and the signed-in app", () => {
    for (const p of ["/view", "/invite", "/api", "/dashboard", "/proposals", "/quotations", "/invoices", "/admin", "/settings"]) expect(PRIVATE_PREFIXES).toContain(p);
  });
  it("never covers a public page that should rank", () => {
    for (const page of PAGES.filter((p) => !p.noindex)) expect(PRIVATE_PREFIXES.some((x) => page.path === x || page.path.startsWith(`${x}/`)), `${page.path} must stay indexable`).toBe(false);
  });
  it("leaves generated links crawlable in robots.txt so noindex can be read", () => {
    for (const p of ["/view", "/invite", "/api"]) expect(ROBOTS_DISALLOW).not.toContain(p);
    expect(ROBOTS_DISALLOW).toContain("/dashboard");
  });
});

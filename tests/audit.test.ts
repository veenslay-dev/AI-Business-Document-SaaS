import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { analyze, overallScore, scoreCategories } from "@/lib/audit/analyze";
import { buildAuditContent } from "@/lib/audit/build";
import { collectSite } from "@/lib/audit/collect";
import { safeFetch } from "@/lib/audit/fetcher";
import { isPrivateAddress, parsePublicUrl, UnsafeUrlError } from "@/lib/audit/ssrf";
import { documentContentSchema } from "@/lib/documents/content";
import { ACME_BRAND } from "@/lib/documents/samples";

describe("SSRF guard", () => {
  it("classifies private and public addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.5", "172.16.0.1", "172.31.255.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1"]) expect(isPrivateAddress(ip), ip).toBe(true);
    for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.32.0.1", "2606:4700:4700::1111"]) expect(isPrivateAddress(ip), ip).toBe(false);
  });
  it("rejects unsafe URLs before any request is made", () => {
    for (const u of ["http://localhost/", "http://127.0.0.1/", "http://169.254.169.254/latest/meta-data", "file:///etc/passwd", "ftp://example.com", "http://user:pw@example.com", "https://example.com:8443", "http://intranet/", "http://[::1]/", "http://foo.internal/", "not a url"]) {
      expect(() => parsePublicUrl(u), u).toThrow(UnsafeUrlError);
    }
  });
  it("adds https and strips the fragment for a plain domain", () => expect(parsePublicUrl("example.com/a#x").toString()).toBe("https://example.com/a"));
  it("safeFetch refuses to connect to loopback even when the URL looks public-shaped", async () => {
    await expect(safeFetch("http://127.0.0.1:80/")).rejects.toBeInstanceOf(UnsafeUrlError);
  });
});

let server: http.Server; let base: string;
beforeAll(async () => {
  server = http.createServer((req, res) => {
    const send = (code: number, type: string, body: string) => { res.writeHead(code, { "content-type": type }); res.end(body); };
    if (req.url === "/robots.txt") return send(200, "text/plain", "User-agent: *\nDisallow: /private\nSitemap: " + base + "/sitemap.xml");
    if (req.url === "/sitemap.xml") return send(200, "application/xml", "<urlset><url><loc>a</loc></url><url><loc>b</loc></url></urlset>");
    if (req.url === "/gone") return send(404, "text/html", "nope");
    if (req.url === "/about") return send(200, "text/html", "<html><head><title>Same title</title></head><body><h1>About</h1><p>short</p></body></html>");
    if (req.url === "/services") return send(200, "text/html", "<html><head><title>Same title</title></head><body><h1>Services</h1><p>short</p></body></html>");
    if (req.url === "/loop") { res.writeHead(302, { location: "/loop" }); return res.end(); }
    send(200, "text/html", `<html lang="en"><head><title>Hi</title><script type="application/ld+json">{bad json</script></head>
      <body><h1>One</h1><h1>Two</h1><img src="a.png"><img src="b.png" alt="ok">
      <a href="/about">About</a><a href="/services">Services</a><a href="/gone">Old page</a><a href="https://other.example/x">ext</a>${"word ".repeat(50)}</body></html>`);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => { server.close(); });

describe("collection and analysis against a real HTTP server", () => {
  it("collects signals and finds the planted problems", async () => {
    const s = await collectSite(base + "/", { allowPrivate: true, pageSpeed: false });
    expect(s.home.h1).toHaveLength(2);
    expect(s.home.imgMissingAlt).toBe(1);
    expect(s.sitemap).toEqual({ found: true, urlCount: 2 });
    expect(s.robots.blocksAll).toBe(false);
    expect(s.brokenLinks.map((b) => new URL(b.url).pathname)).toEqual(["/gone"]);
    expect(s.pages.length).toBeGreaterThanOrEqual(2);

    const f = analyze(s);
    const by = (id: string) => f.find((x) => x.id === id)!;
    expect(by("https").severity).toBe("critical"); // plain http test server
    expect(by("h1").severity).toBe("medium");
    expect(by("title").severity).toBe("medium"); // "Hi" is too short
    expect(by("meta-description").severity).toBe("medium");
    expect(by("alt").status).toBe("open");
    expect(by("schema-errors").severity).toBe("high");
    expect(by("broken-links").affectedUrl).toContain("/gone");
    expect(by("duplicates").severity).toBe("medium");
    expect(by("thin").status).toBe("open");
    expect(by("sitemap").severity).toBe("passed");
    expect(by("robots").severity).toBe("passed");
  });
  it("gives up on redirect loops", async () => {
    await expect(safeFetch(base + "/loop", { allowPrivate: true, maxRedirects: 3 })).rejects.toBeInstanceOf(UnsafeUrlError);
  });
  it("caps oversized bodies", async () => {
    const r = await safeFetch(base + "/", { allowPrivate: true, maxBytes: 100 });
    expect(r.truncated).toBe(true);
  });
});

describe("scoring and report building", () => {
  const healthy = () => ({
    url: "https://x.example/", status: 200, finalUrl: "https://x.example/", redirects: 0, contentType: "text/html", bytes: 50_000, ms: 400,
    title: "A perfectly reasonable title for a page", metaDescription: "A useful description that is between seventy and one hundred and sixty characters long, ok.", canonical: "https://x.example/",
    robotsMeta: "", xRobots: "", h1: ["Main"], h2: ["a", "b"], imgTotal: 2, imgMissingAlt: 0, wordCount: 800, hasViewport: true, lang: "en",
    jsonLdTypes: ["Organization"], jsonLdErrors: 0, internalLinks: [], externalLinkCount: 2, isHttps: true, hsts: true, blogLink: true,
  });
  const site = (over = {}) => ({ origin: "https://x.example", scannedAt: "2026-03-01T00:00:00Z", home: healthy(), pages: [], robots: { status: 200, blocksAll: false, sitemapUrls: [] }, sitemap: { found: true, urlCount: 10 }, brokenLinks: [], httpToHttps: true, psi: { score: 95, lcp: 1800, cls: 0.02, tbt: 100 }, ...over });

  it("scores a healthy site at 100 and a broken one lower", () => {
    const good = scoreCategories(analyze(site()));
    expect(good.every((s) => s.score === 100)).toBe(true);
    const bad = scoreCategories(analyze(site({ home: { ...healthy(), title: "", h1: [], hasViewport: false }, sitemap: { found: false, urlCount: 0 } })));
    expect(overallScore(bad)).toBeLessThan(overallScore(good));
    expect(bad.find((s) => s.category === "On-page SEO")!.score).toBeLessThan(60);
  });
  it("flags noindex and blocked robots as critical", () => {
    const f = analyze(site({ home: { ...healthy(), robotsMeta: "noindex, follow" } }));
    expect(f.find((x) => x.id === "indexability")!.severity).toBe("critical");
    const g = analyze(site({ robots: { status: 200, blocksAll: true, sitemapUrls: [] } }));
    expect(g.find((x) => x.id === "indexability")!.severity).toBe("critical");
  });
  it("omits PageSpeed checks when they weren't measured", () => {
    const f = analyze(site({ psi: null }));
    expect(f.some((x) => x.id === "page-speed")).toBe(false);
    expect(scoreCategories(f).some((s) => s.category === "Performance")).toBe(true); // still has server timing
  });
  it("builds a report that satisfies the document schema", () => {
    const content = buildAuditContent({ brand: ACME_BRAND, client: { company: "Nova", contact: "", email: "", phone: "", address: "" }, url: "https://x.example", findings: analyze(site({ home: { ...healthy(), title: "" } })), scannedAt: "2026-03-01T00:00:00Z" });
    expect(documentContentSchema.safeParse(content).success).toBe(true);
    expect(content.sections[0].blocks[0].type).toBe("audit_summary");
  });
});

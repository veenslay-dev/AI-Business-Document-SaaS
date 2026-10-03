import { describe, expect, it, vi } from "vitest";
import { safeNext } from "@/lib/auth/redirect";
import { looksLikeImage } from "@/lib/uploads";
import { safeImageUrl } from "@/lib/documents/util";
import { clientIp, hashIp } from "@/lib/db/public";
import { isPrivateAddress, parsePublicUrl } from "@/lib/audit/ssrf";
import { csvCell, parsePeriod, periodRange } from "@/lib/db/admin-costs";
import { estimateCostUsd } from "@/lib/billing/ai-cost";

describe("redirects", () => {
  it("keeps same-site paths and rejects everything that can leave the site", () => {
    expect(safeNext("/dashboard?x=1", "/home")).toBe("/dashboard?x=1");
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "/ok\n/evil", "", null, undefined]) expect(safeNext(bad as string, "/home")).toBe("/home");
  });
});

describe("uploads", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]);
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  const html = new TextEncoder().encode("<script>alert(1)</script>");
  it("checks the real file signature, not the declared type", () => {
    expect(looksLikeImage(png, "image/png")).toBe(true);
    expect(looksLikeImage(webp, "image/webp")).toBe(true);
    expect(looksLikeImage(html, "image/png")).toBe(false);
    expect(looksLikeImage(png, "image/jpeg")).toBe(false);
    expect(looksLikeImage(png, "image/svg+xml")).toBe(false);
  });
});

describe("image addresses in documents", () => {
  it("accepts https and small inline images only", () => {
    expect(safeImageUrl("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
    for (const bad of ["http://169.254.169.254/latest", "javascript:alert(1)", "file:///etc/passwd", "https://x.com/a.png\"onerror=\"alert(1)", "data:image/svg+xml;base64,AAAA"]) expect(safeImageUrl(bad)).toBeNull();
    expect(safeImageUrl("data:image/png;base64,iVBORw0KGgo=")).not.toBeNull();
  });
});

describe("visitor addresses", () => {
  it("prefers headers the host sets and salts the hash with a secret", () => {
    const h = new Headers({ "x-forwarded-for": "6.6.6.6", "x-real-ip": "1.2.3.4" });
    expect(clientIp(h)).toBe("1.2.3.4");
    expect(clientIp(new Headers({ "x-vercel-forwarded-for": "9.9.9.9", "x-forwarded-for": "6.6.6.6" }))).toBe("9.9.9.9");
    vi.stubEnv("IP_HASH_SALT", "salt-one"); const a = hashIp("1.2.3.4", "doc");
    vi.stubEnv("IP_HASH_SALT", "salt-two"); const b = hashIp("1.2.3.4", "doc");
    expect(a).not.toBe(b); expect(a).toHaveLength(32);
    vi.unstubAllEnvs();
  });
});

describe("website audit address checks", () => {
  it("refuses internal targets", () => {
    for (const ip of ["127.0.0.1", "10.0.0.5", "192.168.1.1", "169.254.169.254", "::1", "::ffff:7f00:1", "fd00::1"]) expect(isPrivateAddress(ip)).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
    for (const bad of ["http://localhost/", "http://127.0.0.1/", "http://metadata.internal/", "ftp://example.com", "https://user:pw@example.com", "https://example.com:8080"]) expect(() => parsePublicUrl(bad)).toThrow();
  });
});

describe("admin cost pages", () => {
  it("defuses spreadsheet formulas and quotes awkward cells", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(csvCell("+1+1")).toBe("'+1+1"); expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("a,b")).toBe('"a,b"'); expect(csvCell(12.5)).toBe("12.5");
  });
  it("works out periods and prices tokens", () => {
    expect(parsePeriod("bogus")).toBe("month"); expect(parsePeriod("all")).toBe("all");
    const r = periodRange("last-month", new Date("2026-10-15T10:00:00Z"));
    expect(r.from).toBe("2026-09-01T00:00:00.000Z"); expect(r.to).toBe("2026-10-01T00:00:00.000Z");
    expect(periodRange("all").from).toBeNull();
    expect(estimateCostUsd(1_000_000, 1_000_000, { inputPerM: 0.15, outputPerM: 0.6, usdToInr: 88 })).toBeCloseTo(0.75);
  });
});

import { describe, expect, it } from "vitest";
import { buildBrandContext, readableOn } from "@/lib/documents/branding";
import { fontStack, googleFontsUrl } from "@/lib/documents/fonts";

const company = {
  company_name: "Acme Digital", tagline: null, description: null, website: "https://acme.example", email: "hi@acme.example",
  phone: "+91 11111 11111", address: null, gst_number: null, pan_number: null, services: ["SEO", 3, "Web"],
  default_terms: "Net 15", authorized_name: "Asha", authorized_designation: "Founder", signature_url: null,
};
const brand = {
  primary_color: "#1f3a5f", secondary_color: "#e8eef6", accent_color: "#c8553d", heading_font: "Fraunces",
  body_font: "Inter", logo_url: null, dark_logo_url: null, favicon_url: null, default_footer: null,
};

describe("buildBrandContext", () => {
  it("maps rows and drops non-string services", () => {
    const ctx = buildBrandContext(company, brand);
    expect(ctx.company.name).toBe("Acme Digital");
    expect(ctx.company.services).toEqual(["SEO", "Web"]);
    expect(ctx.brand.headingStack).toContain("Fraunces");
  });
  it("is a snapshot: later edits to the source row do not change an earlier context", () => {
    const row = { ...company };
    const before = buildBrandContext(row, brand);
    row.phone = "+91 22222 22222";
    expect(before.company.phone).toBe("+91 11111 11111");
    expect(buildBrandContext(row, brand).company.phone).toBe("+91 22222 22222");
  });
});

describe("readableOn", () => {
  it("picks dark text on light colors and light text on dark colors", () => {
    expect(readableOn("#ffffff")).toBe("#111111");
    expect(readableOn("#1f3a5f")).toBe("#ffffff");
  });
});

describe("fonts", () => {
  it("only emits whitelisted families in the Google Fonts URL", () => {
    const url = googleFontsUrl(["Fraunces", "Evil Font", "Inter"]);
    expect(url).toContain("family=Fraunces");
    expect(url).toContain("family=Inter");
    expect(url).not.toContain("Evil");
    expect(googleFontsUrl(["Nope"])).toBe("");
  });
  it("uses serif fallbacks for serif fonts", () => {
    expect(fontStack("Lora")).toContain("serif");
    expect(fontStack("Inter")).toContain("sans-serif");
  });
});

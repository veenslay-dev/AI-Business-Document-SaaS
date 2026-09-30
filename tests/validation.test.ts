import { describe, expect, it } from "vitest";
import { signupSchema, resetPasswordSchema, loginSchema } from "@/lib/validation/auth";
import { businessInfoSchema, companyInfoSchema } from "@/lib/validation/company";
import { brandKitSchema } from "@/lib/validation/brand";
import { slugify } from "@/lib/utils";

describe("auth validation", () => {
  it("normalizes email and enforces password length", () => {
    const ok = signupSchema.safeParse({ fullName: "Asha Rao", companyName: "Acme", email: " ASHA@Acme.IO ", password: "longenough" });
    expect(ok.success && ok.data.email).toBe("asha@acme.io");
    expect(signupSchema.safeParse({ fullName: "A", companyName: "Acme", email: "x@y.io", password: "short" }).success).toBe(false);
  });
  it("requires matching passwords on reset", () => {
    const r = resetPasswordSchema.safeParse({ password: "password1", confirm: "password2" });
    expect(r.success).toBe(false);
  });
  it("rejects a malformed login email", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
});

describe("company validation", () => {
  it("turns empty optional fields into null and validates URLs", () => {
    const r = companyInfoSchema.parse({ companyName: "Acme Digital", website: "", email: "" });
    expect(r.website).toBeNull();
    expect(r.email).toBeNull();
    expect(companyInfoSchema.safeParse({ companyName: "Acme", website: "acme.com" }).success).toBe(false);
    expect(companyInfoSchema.safeParse({ companyName: "Acme", website: "https://acme.com" }).success).toBe(true);
  });
  it("splits services one per line and caps the list", () => {
    const r = businessInfoSchema.parse({ services: "SEO\n\n  Web design \r\nContent" });
    expect(r.services).toEqual(["SEO", "Web design", "Content"]);
    const many = businessInfoSchema.parse({ services: Array.from({ length: 50 }, (_, i) => `s${i}`).join("\n") });
    expect(many.services).toHaveLength(30);
  });
});

describe("brand validation", () => {
  const base = { primaryColor: "#1f3a5f", secondaryColor: "#e8eef6", accentColor: "#c8553d", headingFont: "Fraunces", bodyFont: "Inter" };
  it("accepts a valid kit", () => expect(brandKitSchema.safeParse(base).success).toBe(true));
  it("rejects bad hex and non-whitelisted fonts", () => {
    expect(brandKitSchema.safeParse({ ...base, primaryColor: "red" }).success).toBe(false);
    expect(brandKitSchema.safeParse({ ...base, headingFont: "Comic Sans; }</style><script>" }).success).toBe(false);
  });
});

describe("slugify", () => {
  it("makes url-safe slugs", () => {
    expect(slugify("Acme Digital, Pvt. Ltd.")).toBe("acme-digital-pvt-ltd");
    expect(slugify("Café Zoë")).toBe("cafe-zoe");
    expect(slugify("!!!")).toBe("");
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { gaId } from "@/lib/analytics";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";

const KEYS = ["NEXT_PUBLIC_GA_ID", "VERCEL_ENV"] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
afterEach(() => { for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });
const reset = () => { for (const k of KEYS) delete process.env[k]; };

describe("Google Analytics", () => {
  it("is off locally, in tests and on preview deployments", () => {
    reset(); expect(gaId()).toBeNull();
    process.env.VERCEL_ENV = "preview"; expect(gaId()).toBeNull();
    process.env.VERCEL_ENV = "development"; expect(gaId()).toBeNull();
  });
  it("uses the site's ID on the live production deployment", () => { reset(); process.env.VERCEL_ENV = "production"; expect(gaId()).toBe("G-WMDN196VGY"); });
  it("lets an environment variable choose another ID or switch it off", () => {
    reset(); process.env.VERCEL_ENV = "production"; process.env.NEXT_PUBLIC_GA_ID = "G-ABCD1234"; expect(gaId()).toBe("G-ABCD1234");
    process.env.NEXT_PUBLIC_GA_ID = ""; expect(gaId()).toBeNull();
  });
  it("ignores anything that is not a plain GA4 ID, since the value ends up inside a script", () => {
    reset(); for (const bad of ["G-x');alert(1);//", "UA-12345-1", "G-", "<script>", "g-lower123"]) { process.env.NEXT_PUBLIC_GA_ID = bad; expect(gaId(), bad).toBeNull(); }
  });
  it("renders nothing without an ID and the Google tag with one", () => {
    reset(); expect(GoogleAnalytics()).toBeNull();
    process.env.NEXT_PUBLIC_GA_ID = "G-WMDN196VGY";
    const out = JSON.stringify(GoogleAnalytics());
    expect(out).toContain("https://www.googletagmanager.com/gtag/js?id=G-WMDN196VGY");
    expect(out).toContain("gtag('config','G-WMDN196VGY')");
    expect(out).toContain("ad_storage:'denied'");
  });
});

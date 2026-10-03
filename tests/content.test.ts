import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FACTS, freePlanLine } from "@/lib/content/facts";
import { FAQ_BANK, PAGE_FAQ, faqFor } from "@/lib/content/faq";
import { PAGES } from "@/lib/seo/registry";
import { TEMPLATE_HUB, TEMPLATE_PAGES } from "@/lib/seo/templates";
import { PLAN_CARDS, FEATURES } from "@/lib/marketing";
import { PLANS } from "@/lib/billing/plans";

/** Everything the public pages say in words, gathered in one place. */
const faqText = Object.values(PAGE_FAQ).flat().concat(TEMPLATE_PAGES.flatMap((t) => t.faq));
const allCopy = [
  ...PAGES.flatMap((p) => [p.title, p.description, p.heading ?? "", p.intro ?? ""]),
  ...faqText.flatMap((f) => [f.q, f.a]),
  ...Object.values(FAQ_BANK).flatMap((f) => [f.q, f.a]),
  ...TEMPLATE_PAGES.flatMap((t) => [t.intro, t.bestFor, ...t.includes, ...t.tips, ...t.steps.flatMap((s) => [s.title, s.body])]),
  TEMPLATE_HUB.intro, TEMPLATE_HUB.description,
  ...PLAN_CARDS.flatMap((p) => [p.blurb, ...p.features]), ...FEATURES.flatMap((f) => [f.title, f.body]),
].join("\n");

describe("page content is consistent", () => {
  it("quotes only real plan numbers", () => {
    const docs = new Set<number>([PLANS.free, PLANS.professional].map((p) => p.monthlyDocuments as number));
    const ai = new Set<number>(Object.values(PLANS).map((p) => p.aiPerMonth));
    for (const m of allCopy.matchAll(/(\d[\d,]*) documents\b/g)) expect(docs.has(Number(m[1].replace(/,/g, ""))), `"${m[0]}" is not a real document limit`).toBe(true);
    for (const m of allCopy.matchAll(/(\d[\d,]*) AI actions\b/g)) expect(ai.has(Number(m[1].replace(/,/g, ""))), `"${m[0]}" is not a real AI limit`).toBe(true);
  });
  it("quotes only real prices", () => {
    const ok = new Set([0, FACTS.pro.monthly, FACTS.agency.monthly, FACTS.pro.yearly, FACTS.agency.yearly, Math.round(FACTS.pro.yearly / 12), Math.round(FACTS.agency.yearly / 12), 1000]);
    for (const m of allCopy.matchAll(/₹([\d,]+)/g)) expect(ok.has(Number(m[1].replace(/,/g, ""))), `"${m[0]}" is not a plan price`).toBe(true);
  });
  it("states the billing rules the same way everywhere", () => {
    // Sentences that say plans do NOT renew are the right ones; strip those, then nothing should claim a renewal.
    const withoutDenials = allCopy.split("\n").filter((l) => !l.trim().endsWith("?")).join("\n").replace(/\b(do not|does not|doesn't|never|not|none|no)\s+(renew(s|ed)?\s+(automatically|on its own)|auto-?renew\w*)/gi, "");
    expect(withoutDenials).not.toMatch(/renews? (automatically|on its own)|auto-?renew|recurring subscription/i);
    expect(allCopy).not.toMatch(/coming soon|are planned|not yet available|card payments are planned/i);
    expect(allCopy).not.toMatch(/pay(ments)? in (USD|dollars)|charged in (USD|dollars)/i);
    const refund = [...allCopy.matchAll(/within (\d+) days of your first payment/g)].map((m) => Number(m[1]));
    expect(refund.length).toBeGreaterThan(0);
    for (const d of refund) expect(d).toBe(FACTS.refundDays);
  });
  it("the Refund Policy page uses the same refund window", () => {
    const src = readFileSync("app/(marketing)/refund-policy/page.tsx", "utf8");
    for (const m of src.matchAll(/\b(\d+) days\b/g)) expect(Number(m[1])).toBe(FACTS.refundDays);
  });
  it("one question never has two different answers", () => {
    const seen = new Map<string, string>();
    for (const f of faqText) { if (seen.has(f.q)) expect(seen.get(f.q), `"${f.q}" is answered two ways`).toBe(f.a); seen.set(f.q, f.a); }
  });
  it("every main page has a FAQ section with direct answers", () => {
    for (const path of ["/", "/pricing", "/about", "/contact", TEMPLATE_HUB.path, ...TEMPLATE_PAGES.map((t) => t.path)]) {
      const list = faqFor(path); expect(list.length, `${path} needs questions`).toBeGreaterThanOrEqual(4);
      for (const f of list) { expect(f.q.endsWith("?")).toBe(true); expect(f.a.length).toBeGreaterThan(60); expect(f.a.length).toBeLessThan(600); }
    }
  });
  it("the free plan line matches the plan table", () => { expect(freePlanLine).toBe(`${PLANS.free.monthlyDocuments} documents and ${PLANS.free.aiPerMonth} AI actions a month`); });
  it("page titles and descriptions are the right length for search results", () => {
    for (const p of PAGES) {
      const shown = p.absoluteTitle ? p.title : `${p.title} | PrioDraft`;
      expect(shown.length, `${p.path} title: ${shown}`).toBeLessThanOrEqual(65);
      expect(p.description.length, `${p.path} description`).toBeGreaterThanOrEqual(80);
      expect(p.description.length, `${p.path} description`).toBeLessThanOrEqual(165);
    }
  });
  it("follows the house style: no em dashes and no filler openers", () => {
    expect(allCopy).not.toContain("—");
    expect(allCopy).not.toMatch(/in today's|let's dive|comprehensive guide|game-changing|cutting-edge|seamless|unlock/i);
  });
});

import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentRenderer } from "@/components/documents/document-renderer";
import { documentContentSchema } from "@/lib/documents/content";
import { ACME_BRAND, sampleSocialAudit } from "@/lib/documents/samples";
import { getSystemTemplate, SYSTEM_TEMPLATES } from "@/lib/documents/templates";
import { isSectionEmpty } from "@/lib/documents/util";
import { buildSocialAuditContent, checklistSection, customChecklistSection, customFindingsSection } from "@/lib/social/build";
import { GENERAL_SECTIONS, LIBRARY, PLATFORM_SECTIONS, getLibrarySection } from "@/lib/social/library";
import { checklistScore, computeScorecard, type ChecklistItem } from "@/lib/social/score";

const item = (status: ChecklistItem["status"], over: Partial<ChecklistItem> = {}): ChecklistItem => ({ id: Math.random().toString(36), item: "x", status, priority: "", note: "", recommendation: "", ...over });
const render = (c = sampleSocialAudit(), key = "social-audit-scorecard") => renderToStaticMarkup(createElement(DocumentRenderer, { content: c, brand: ACME_BRAND, template: getSystemTemplate(key)!.config, meta: { type: "social_audit" } }));

describe("social audit library", () => {
  it("has general and platform sections with unique keys and non-empty items", () => {
    expect(new Set(LIBRARY.map((l) => l.key)).size).toBe(LIBRARY.length);
    expect(GENERAL_SECTIONS.length).toBeGreaterThanOrEqual(6);
    expect(PLATFORM_SECTIONS.map((p) => p.key)).toEqual(expect.arrayContaining(["instagram", "facebook", "linkedin", "youtube"]));
    for (const l of LIBRARY) { expect(l.items.length).toBeGreaterThan(4); expect(l.items.every((i) => i.trim().length > 5)).toBe(true); }
    expect(getLibrarySection("instagram")?.title).toBe("Instagram");
  });
});

describe("checklist scoring", () => {
  it("counts good fully, needs work half and poor as zero", () => {
    expect(checklistScore([item("good"), item("good")]).score).toBe(100);
    expect(checklistScore([item("good"), item("needs_work")]).score).toBe(75);
    expect(checklistScore([item("good"), item("poor")]).score).toBe(50);
    expect(checklistScore([item("poor")]).score).toBe(0);
  });
  it("leaves unchecked and N/A items out instead of penalising them", () => {
    expect(checklistScore([item("good"), item("unchecked"), item("na")]).score).toBe(100);
    expect(checklistScore([item("unchecked"), item("na")]).score).toBeNull();
    expect(checklistScore([]).score).toBeNull();
  });
});

describe("scorecard", () => {
  it("is computed from the current answers, per section, with priorities ordered high first", () => {
    const sc = computeScorecard(sampleSocialAudit());
    expect(sc.sections.map((s) => s.title)).toContain("Profiles and branding");
    const profile = sc.sections.find((s) => s.title === "Profiles and branding")!;
    expect(profile.score).toBe(50); // good + needs work + poor = (1 + .5 + 0) / 3
    expect(sc.overall).not.toBeNull();
    expect(sc.counts.poor).toBeGreaterThan(0);
    expect(sc.priorities[0].priority).toBe("high");
    expect(sc.priorities.every((p) => p.status !== ("good" as never))).toBe(true);
  });
  it("updates when an answer changes", () => {
    const c = sampleSocialAudit();
    const before = computeScorecard(c).overall!;
    for (const s of c.sections) for (const b of s.blocks) if (b.type === "checklist") b.items.forEach((i) => { if (i.status !== "unchecked") i.status = "good"; });
    expect(computeScorecard(c).overall).toBe(100);
    expect(before).toBeLessThan(100);
  });
  it("has no scores for an audit nobody has started", () => {
    const c = buildSocialAuditContent({ brand: ACME_BRAND, client: { company: "X", contact: "", email: "", phone: "", address: "" }, accounts: [{ platform: "instagram", handle: "@x", url: "" }], date: "2026-01-01" });
    expect(computeScorecard(c).overall).toBeNull();
  });
});

describe("building and rendering", () => {
  it("builds a valid document with general sections, the chosen platforms and the working tables", () => {
    const c = buildSocialAuditContent({ brand: ACME_BRAND, client: { company: "X", contact: "", email: "", phone: "", address: "" }, date: "2026-01-01",
      accounts: [{ platform: "linkedin", handle: "x", url: "" }, { platform: "youtube", handle: "y", url: "" }] });
    expect(documentContentSchema.safeParse(c).success).toBe(true);
    const titles = c.sections.map((s) => s.title);
    expect(titles).toEqual(expect.arrayContaining(["Audit overview", "Social media scorecard", "Profiles and branding", "LinkedIn", "YouTube", "Competitor benchmarking", "Key findings and recommendations", "Action plan"]));
    expect(titles).not.toContain("Instagram");
  });
  it("lets auditors add custom checklists and findings sections", () => {
    const c = sampleSocialAudit();
    c.sections.push(customChecklistSection("Reputation and reviews"), customFindingsSection("Brand safety"), checklistSection(getLibrarySection("youtube")!));
    expect(documentContentSchema.safeParse(c).success).toBe(true);
  });
  it("renders statuses, notes, recommendations and the scorecard", () => {
    const html = render();
    for (const t of ["Profiles and branding", "Good", "Needs work", "Poor", "Recommendation:", "Biggest opportunities", "Overall", "Google reviews are not linked"]) expect(html).toContain(t);
    expect(html).toContain("Bio lists services but not the city");
  });
  it("hides the empty working tables and empty findings until they are filled in", () => {
    const c = buildSocialAuditContent({ brand: ACME_BRAND, client: { company: "X", contact: "", email: "", phone: "", address: "" }, accounts: [{ platform: "instagram", handle: "@x", url: "" }], date: "2026-01-01" });
    const html = render(c);
    expect(html).not.toContain("Competitor benchmarking");
    expect(html).not.toContain("Action plan");
    expect(html).not.toContain("Key findings and recommendations");
    expect(isSectionEmpty(customFindingsSection())).toBe(true);
  });
  it("renders in every social audit template", () => {
    for (const t of SYSTEM_TEMPLATES.filter((x) => x.type === "social_audit")) expect(render(sampleSocialAudit(), t.key)).toContain("scorecard");
  });
});

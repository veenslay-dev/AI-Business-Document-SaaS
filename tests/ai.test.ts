import { afterEach, describe, expect, it, vi } from "vitest";
import { companyContext, selectKnowledge } from "@/lib/ai/context";
import { analyzeAudit, generateProposal, improveDocumentContent } from "@/lib/ai/functions";
import { extractJson, generateStructured } from "@/lib/ai/json";
import { anthropicProvider, getProvider, openAiProvider } from "@/lib/ai/providers";
import { AI_LIMITS, decideLimit } from "@/lib/ai/ratelimit";
import { proposalAiSchema, improveSchema } from "@/lib/ai/schemas";
import { AI_USER_MESSAGES, AiError, type AiProvider } from "@/lib/ai/types";
import { aiAllowance, canUsePremiumTemplates, documentAllowance, effectivePlan, formatPlanPrice, PLANS } from "@/lib/billing/plans";
import { SAMPLE_PROPOSAL_AI, ACME_BRAND } from "@/lib/documents/samples";

const scripted = (...replies: string[]): AiProvider & { calls: number; prompts: string[] } => {
  const p = { name: "fake", usage: { input: 0, output: 0, model: "fake" }, calls: 0, prompts: [] as string[], async complete(req: { user: string }) { p.prompts.push(req.user); return replies[Math.min(p.calls++, replies.length - 1)]; } };
  return p;
};

const input = { clientName: "Nova", projectTitle: "SEO plan", description: "d", goals: "g", requirements: "r", services: ["SEO"], timeline: "3 months", budget: "85000", notes: "", currency: "INR" };

describe("extractJson", () => {
  it("reads plain, fenced and prose-wrapped JSON", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a":2}\n```')).toEqual({ a: 2 });
    expect(extractJson('Sure! Here you go: {"a":3} Hope that helps.')).toEqual({ a: 3 });
    expect(extractJson("no json here")).toBeUndefined();
  });
});

describe("structured generation", () => {
  it("validates proposal output against the schema", async () => {
    const p = scripted(JSON.stringify(SAMPLE_PROPOSAL_AI));
    const r = await generateProposal(p, ACME_BRAND, input);
    expect(r.title).toBe(SAMPLE_PROPOSAL_AI.title);
    expect(r.investment.items[0].amount).toBe(60000);
  });
  it("coerces numeric strings for amounts", () => {
    const r = proposalAiSchema.parse({ ...SAMPLE_PROPOSAL_AI, investment: { items: [{ name: "x", description: "", amount: "1500" }], notes: "" } });
    expect(r.investment.items[0].amount).toBe(1500);
  });
  it("retries once with feedback when the first reply is invalid", async () => {
    const p = scripted('{"title": ""}', JSON.stringify(SAMPLE_PROPOSAL_AI));
    const r = await generateProposal(p, ACME_BRAND, input);
    expect(r.title).toBeTruthy();
    expect(p.calls).toBe(2);
    expect(p.prompts[1]).toContain("not valid");
  });
  it("throws invalid_output after two bad replies, never returning unvalidated data", async () => {
    const p = scripted("garbage", '{"title": 5}');
    await expect(generateProposal(p, ACME_BRAND, input)).rejects.toMatchObject({ code: "invalid_output" });
    expect(p.calls).toBe(2);
  });
  it("rejects negative amounts and oversize lists", () => {
    expect(proposalAiSchema.safeParse({ ...SAMPLE_PROPOSAL_AI, investment: { items: [{ name: "x", amount: -5 }] } }).success).toBe(false);
    expect(proposalAiSchema.safeParse({ ...SAMPLE_PROPOSAL_AI, client_challenges: Array.from({ length: 50 }, () => "x") }).success).toBe(false);
  });
  it("improveDocumentContent returns only validated text", async () => {
    expect(await improveDocumentContent(scripted('{"content":"Better text."}'), ACME_BRAND, { command: "shorter", text: "Long text." })).toBe("Better text.");
    await expect(generateStructured(scripted("{}"), improveSchema, { system: "s", user: "u" })).rejects.toBeInstanceOf(AiError);
  });
  it("analyzeAudit keeps finding ids", async () => {
    const r = await analyzeAudit(scripted('{"summary":"ok","findings":[{"id":"h1","explanation":"e","recommendation":"r"}]}'), ACME_BRAND, { url: "https://x.example", clientName: "X", findings: [] });
    expect(r.findings[0].id).toBe("h1");
  });
  it("puts company facts and relevant knowledge in the prompt", async () => {
    const p = scripted(JSON.stringify(SAMPLE_PROPOSAL_AI));
    await generateProposal(p, ACME_BRAND, input, [{ title: "Dental case study", type: "case_study", content: "Doubled enquiries for a Kochi clinic" }]);
    expect(p.prompts[0]).toContain("Acme Digital");
    expect(p.prompts[0]).toContain("Technical SEO audits");
    expect(p.prompts[0]).toContain("Doubled enquiries");
  });
});

describe("knowledge selection", () => {
  const kb = [
    { title: "Dental SEO case study", type: "case_study", content: "We grew a dental clinic's bookings" },
    { title: "Pricing sheet", type: "pricing", content: "Retainers start at 50,000" },
    { title: "Office party photos", type: "note", content: "Cake" },
  ];
  it("ranks by overlap and drops unrelated items", () => {
    const r = selectKnowledge(kb, "SEO for a dental clinic");
    expect(r[0].title).toBe("Dental SEO case study");
    expect(r.some((k) => k.title === "Office party photos")).toBe(false);
    expect(selectKnowledge(kb, "")).toEqual([]);
  });
  it("companyContext includes services and knowledge", () => {
    expect(companyContext(ACME_BRAND, kb.slice(0, 1))).toContain("Dental SEO case study");
  });
});

describe("providers", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("openai provider sends the key only in the auth header and parses the reply", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "hello" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await openAiProvider("sk-secret", "gpt-x").complete({ system: "s", user: "u", json: true })).toBe("hello");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("api.openai.com");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer sk-secret");
    expect(String(init.body)).not.toContain("sk-secret");
    expect(String(init.body)).toContain("json_object");
  });
  it("anthropic provider parses text blocks", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ content: [{ type: "text", text: "hi " }, { type: "text", text: "there" }] }), { status: 200 })));
    expect(await anthropicProvider("k", "m").complete({ system: "s", user: "u" })).toBe("hi there");
  });
  it("turns provider failures into safe errors that never contain the key or body", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Invalid API key sk-secret", { status: 401 })));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const err = (await openAiProvider("sk-secret", "m").complete({ system: "s", user: "u" }).catch((e: unknown) => e)) as AiError;
    expect(err).toBeInstanceOf(AiError);
    expect(err.code).toBe("provider_error");
    expect(err.message).not.toContain("sk-secret");
    expect(AI_USER_MESSAGES[err.code]).not.toContain("sk-");
  });
  it("reports a network failure as a provider error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    await expect(openAiProvider("k", "m").complete({ system: "s", user: "u" })).rejects.toMatchObject({ code: "provider_error" });
  });
  it("selects the provider from the environment and requires a key", () => {
    vi.stubEnv("AI_PROVIDER", "openai"); vi.stubEnv("OPENAI_API_KEY", "");
    expect(() => getProvider()).toThrowError(expect.objectContaining({ code: "not_configured" }));
    vi.stubEnv("OPENAI_API_KEY", "k");
    expect(getProvider().name).toBe("openai");
    vi.stubEnv("AI_PROVIDER", "anthropic"); vi.stubEnv("ANTHROPIC_API_KEY", "k");
    expect(getProvider().name).toBe("anthropic");
  });
});

describe("limits and plans", () => {
  it("rate limits per user and per workspace", () => {
    expect(decideLimit({ workspaceLastHour: 0, userLastMinute: 0 })).toEqual({ ok: true });
    expect(decideLimit({ workspaceLastHour: 0, userLastMinute: AI_LIMITS.perUserMinute })).toEqual({ ok: false, reason: "user" });
    expect(decideLimit({ workspaceLastHour: AI_LIMITS.perWorkspaceHour, userLastMinute: 0 })).toEqual({ ok: false, reason: "workspace" });
  });
  it("enforces plan limits by default and can be switched off", () => {
    vi.stubEnv("BILLING_ENFORCEMENT", "off");
    expect(documentAllowance({ plan: "free" }, 99).ok).toBe(true);
    expect(aiAllowance({ plan: "free" }, 99).ok).toBe(true);
    vi.unstubAllEnvs();
    expect(documentAllowance({ plan: "free" }, 9).ok).toBe(true);
    expect(documentAllowance({ plan: "free" }, 10)).toMatchObject({ ok: false, limit: 10, reason: "limit" });
    expect(aiAllowance({ plan: "free" }, 2).ok).toBe(true);
    expect(aiAllowance({ plan: "free" }, 3)).toMatchObject({ ok: false, limit: 3 });
    expect(documentAllowance({ plan: "professional" }, 99).ok).toBe(true);
    expect(documentAllowance({ plan: "professional" }, 100).ok).toBe(false);
    expect(documentAllowance({ plan: "agency" }, 5000).ok).toBe(true);
    expect(aiAllowance({ plan: "agency" }, 200).ok).toBe(false);
  });
  it("applies per-workspace limits, suspension and unknown plans", () => {
    const custom = { plan: "custom", limits: { aiPerMonth: 5000, monthlyDocuments: 40, teamMembers: 25 } };
    expect(effectivePlan(custom)).toMatchObject({ aiPerMonth: 5000, monthlyDocuments: 40, teamMembers: 25 });
    expect(documentAllowance(custom, 40).ok).toBe(false);
    expect(effectivePlan({ plan: "nonsense" }).id).toBe("free");
    expect(effectivePlan({ plan: "free", limits: { aiPerMonth: -3, monthlyDocuments: "x" } })).toMatchObject({ aiPerMonth: 3, monthlyDocuments: 10 });
    expect(documentAllowance({ plan: "agency", status: "suspended" }, 0)).toMatchObject({ ok: false, reason: "suspended" });
    expect(aiAllowance({ plan: "agency", status: "suspended" }, 0).ok).toBe(false);
  });
  it("keeps premium templates for paid plans", () => {
    expect(canUsePremiumTemplates({ plan: "free" })).toBe(false);
    expect(canUsePremiumTemplates({ plan: "professional" })).toBe(true);
    expect(canUsePremiumTemplates({ plan: "free", limits: { premiumTemplates: true } })).toBe(true);
  });
  it("prices plans per month and per year", () => {
    expect(formatPlanPrice("free", false).amount).toBe("₹0");
    expect(formatPlanPrice("professional", false).amount).toBe("₹999");
    expect(formatPlanPrice("professional", true).amount).toBe("₹833");
    expect(formatPlanPrice("agency", false).amount).toBe("₹2,999");
    expect(formatPlanPrice("custom", false).amount).toBe("Custom");
    expect(PLANS.free).toMatchObject({ monthlyDocuments: 10, aiPerMonth: 3 });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACME_BRAND, sampleProposal } from "@/lib/documents/samples";
import { TOKEN_RE, canRespond, isBot, resolvePublicState } from "@/lib/public/access";
import { acceptSchema, changesSchema } from "@/lib/validation/public";
import { fakeSupabase, type Tables } from "./fake-db";

const TOKEN = "a".repeat(48);
let tables: Tables;

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => fakeSupabase(tables) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }) }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const PNG = "data:image/png;base64,iVBORw0KGgo=";
const okInput = { name: "Rohan Mehta", email: "rohan@nova.example", designation: "MD", agree: true as const, signature: PNG };

function seed(over: Record<string, unknown> = {}) {
  tables = {
    documents: [{ id: "d1", workspace_id: "w1", type: "proposal", title: "Plan", status: "sent", public_token: TOKEN, expires_at: null, content_json: sampleProposal(), brand_snapshot: ACME_BRAND, template_id: null, template_key: "proposal-modern", ...over }],
    document_actions: [], document_views: [], company_profiles: [], brand_kits: [], document_templates: [],
  };
}

describe("public access rules", () => {
  it("only accepts 48 char hex tokens", () => {
    expect(TOKEN_RE.test(TOKEN)).toBe(true);
    for (const bad of ["", "abc", "../../etc/passwd", "g".repeat(48), "a".repeat(47), "A".repeat(48)]) expect(TOKEN_RE.test(bad)).toBe(false);
  });
  it("hides drafts and expires old documents", () => {
    expect(resolvePublicState({ status: "draft", expires_at: null })).toBe("not_shared");
    expect(resolvePublicState({ status: "sent", expires_at: null })).toBe("ok");
    expect(resolvePublicState({ status: "sent", expires_at: "2000-01-01T00:00:00Z" })).toBe("expired");
    expect(resolvePublicState({ status: "expired", expires_at: null })).toBe("expired");
    expect(resolvePublicState({ status: "accepted", expires_at: "2000-01-01T00:00:00Z" })).toBe("ok"); // a signed document stays viewable
  });
  it("lets clients respond only to open proposals and quotations", () => {
    expect(canRespond("sent", "proposal", "ok")).toBe(true);
    expect(canRespond("viewed", "quotation", "ok")).toBe(true);
    expect(canRespond("accepted", "proposal", "ok")).toBe(false);
    expect(canRespond("sent", "seo_audit", "ok")).toBe(false);
    expect(canRespond("sent", "proposal", "expired")).toBe(false);
  });
  it("skips link preview bots", () => {
    expect(isBot("Slackbot-LinkExpanding 1.0")).toBe(true);
    expect(isBot("WhatsApp/2.23")).toBe(true);
    expect(isBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Mobile Safari")).toBe(false);
  });
});

describe("acceptance validation", () => {
  it("requires agreement, a real email and a PNG signature", () => {
    expect(acceptSchema.safeParse(okInput).success).toBe(true);
    expect(acceptSchema.safeParse({ ...okInput, agree: false }).success).toBe(false);
    expect(acceptSchema.safeParse({ ...okInput, email: "nope" }).success).toBe(false);
    expect(acceptSchema.safeParse({ ...okInput, signature: "data:text/html;base64,PHNjcmlwdD4=" }).success).toBe(false);
    expect(acceptSchema.safeParse({ ...okInput, signature: "" }).success).toBe(false);
  });
  it("requires a meaningful change request", () => {
    expect(changesSchema.safeParse({ comment: "hi" }).success).toBe(false);
    expect(changesSchema.safeParse({ comment: "Please lower the retainer to 70,000" }).success).toBe(true);
  });
});

describe("client responses", () => {
  beforeEach(() => seed());

  it("accepting marks the document accepted and records the signer", async () => {
    const { acceptDocumentAction } = await import("@/lib/actions/public");
    const res = await acceptDocumentAction(TOKEN, okInput);
    expect(res.ok).toBe(true);
    expect(tables.documents[0].status).toBe("accepted");
    const action = tables.document_actions.find((a) => a.action === "accepted")!;
    expect((action.metadata as { name: string }).name).toBe("Rohan Mehta");
    expect(JSON.stringify(action.metadata)).not.toContain("203.0.113.7"); // raw IP is never stored
  });
  it("a second acceptance is refused", async () => {
    const { acceptDocumentAction } = await import("@/lib/actions/public");
    await acceptDocumentAction(TOKEN, okInput);
    const again = await acceptDocumentAction(TOKEN, okInput);
    expect(again.ok).toBe(false);
    expect(tables.document_actions.filter((a) => a.action === "accepted")).toHaveLength(1);
  });
  it("rejects with a reason", async () => {
    const { rejectDocumentAction } = await import("@/lib/actions/public");
    expect((await rejectDocumentAction(TOKEN, { reason: "Over budget" })).ok).toBe(true);
    expect(tables.documents[0].status).toBe("rejected");
  });
  it("request changes keeps the document open and stores the comment", async () => {
    const { requestChangesAction } = await import("@/lib/actions/public");
    const res = await requestChangesAction(TOKEN, { comment: "Please add a phased payment option", name: "Rohan" });
    expect(res.ok).toBe(true);
    expect(tables.documents[0].status).toBe("sent");
    expect((tables.document_actions.find((a) => a.action === "comment_added")!.metadata as { comment: string }).comment).toContain("phased");
  });
  it("refuses responses on drafts, expired documents and unknown tokens", async () => {
    const { acceptDocumentAction } = await import("@/lib/actions/public");
    seed({ status: "draft" });
    expect((await acceptDocumentAction(TOKEN, okInput)).ok).toBe(false);
    seed({ expires_at: "2000-01-01T00:00:00Z" });
    expect((await acceptDocumentAction(TOKEN, okInput)).ok).toBe(false);
    seed();
    expect((await acceptDocumentAction("b".repeat(48), okInput)).ok).toBe(false);
    expect(tables.documents[0].status).toBe("sent");
  });
  it("will not accept an SEO audit", async () => {
    const { acceptDocumentAction } = await import("@/lib/actions/public");
    seed({ type: "seo_audit" });
    expect((await acceptDocumentAction(TOKEN, okInput)).ok).toBe(false);
  });
  it("marks an expired document as expired when it is looked up", async () => {
    const { getPublicDocument } = await import("@/lib/db/public");
    seed({ expires_at: "2000-01-01T00:00:00Z" });
    const r = await getPublicDocument(TOKEN);
    expect(r !== "invalid" && r.state).toBe("expired");
    expect(tables.documents[0].status).toBe("expired");
  });
  it("public lookups reveal nothing for malformed tokens", async () => {
    const { getPublicDocument } = await import("@/lib/db/public");
    expect(await getPublicDocument("' or 1=1 --")).toBe("invalid");
  });
});

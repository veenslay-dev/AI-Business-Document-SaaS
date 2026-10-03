import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseContent } from "@/lib/documents/content";
import { parseSnapshot } from "@/lib/documents/snapshot";
import { loadLiveBrand, loadTemplateConfig, DOC_COLUMNS, type DocRecord, type RenderData } from "@/lib/db/render";
import { TOKEN_RE, resolvePublicState, type PublicState } from "@/lib/public/access";
import type { Acceptance } from "@/components/documents/document-renderer";

export type PublicDocument = {
  doc: DocRecord; render: RenderData; state: PublicState; acceptance: Acceptance | null; contact: { name: string; email: string | null; phone: string | null };
};

/**
 * Looks a document up by its public token. This is the only path anonymous visitors use.
 * It runs with the service role, so it must return nothing but what the public page shows.
 */
export async function getPublicDocument(token: string): Promise<PublicDocument | "invalid"> {
  if (!TOKEN_RE.test(token)) return "invalid";
  const admin = createAdminClient();
  const { data } = await admin.from("documents").select(DOC_COLUMNS).eq("public_token", token).maybeSingle();
  if (!data) return "invalid";
  const doc = data as DocRecord;

  const content = parseContent(doc.content_json);
  const brand = (doc.brand_snapshot ? parseSnapshot(doc.brand_snapshot) : null) ?? (await loadLiveBrand(admin, doc.workspace_id));
  if (!content || !brand) return "invalid";

  const state = resolvePublicState(doc);
  // Lazily record expiry so the owner's dashboard shows it.
  if (state === "expired" && (doc.status === "sent" || doc.status === "viewed")) {
    await admin.from("documents").update({ status: "expired" }).eq("id", doc.id);
    doc.status = "expired";
  }

  const { data: acc } = await admin.from("document_actions").select("metadata, created_at").eq("document_id", doc.id).eq("action", "accepted").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const m = (acc?.metadata ?? {}) as { name?: string; designation?: string; signature?: string };
  return {
    doc, state,
    render: { content, brand, template: await loadTemplateConfig(admin, doc), frozen: !!doc.brand_snapshot },
    acceptance: acc ? { name: m.name ?? "", designation: m.designation, date: acc.created_at, signatureDataUrl: m.signature ?? null } : null,
    contact: { name: brand.company.name, email: brand.company.email, phone: brand.company.phone },
  };
}

/** One-way hash of the visitor's IP, scoped to the document. The raw address is never stored. */
export function hashIp(ip: string | null, documentId: string): string {
  return createHash("sha256").update(`${process.env.IP_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "unset"}:${documentId}:${ip ?? "unknown"}`).digest("hex").slice(0, 32);
}

export function clientIp(headers: Headers): string | null {
  // Hosts such as Vercel set these themselves. A visitor-supplied X-Forwarded-For comes last because it can be faked.
  return headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

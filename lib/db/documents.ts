import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DocType } from "@/lib/documents/templates";

export const PAGE_SIZE = 15;

export type DocumentRow = {
  id: string; title: string; type: DocType; status: string; total_amount: number | null; currency: string | null;
  updated_at: string; client_id: string | null; client_name: string | null; views: number; last_viewed_at: string | null;
};

export type DocumentFilter = {
  workspaceId: string; type?: DocType; clientId?: string; projectId?: string; q?: string; status?: string; page?: number; pageSize?: number;
};

/** Escapes % and _ so user text can't act as an ILIKE wildcard, and strips characters that break PostgREST filters. */
export const likeTerm = (q: string) => q.trim().slice(0, 80).replace(/[\\%_]/g, (c) => `\\${c}`).replace(/[,()]/g, " ");

export async function listDocuments(f: DocumentFilter): Promise<{ rows: DocumentRow[]; total: number }> {
  const supabase = await createClient();
  const size = f.pageSize ?? PAGE_SIZE;
  const page = Math.max(1, f.page ?? 1);
  let q = supabase
    .from("documents")
    .select("id, title, type, status, total_amount, currency, updated_at, client_id, clients(company_name)", { count: "exact" })
    .eq("workspace_id", f.workspaceId)
    .order("updated_at", { ascending: false })
    .range((page - 1) * size, page * size - 1);
  if (f.type) q = q.eq("type", f.type);
  if (f.clientId) q = q.eq("client_id", f.clientId);
  if (f.projectId) q = q.eq("project_id", f.projectId);
  if (f.status) q = q.eq("status", f.status);
  if (f.q?.trim()) q = q.ilike("title", `%${likeTerm(f.q)}%`);
  const { data, count } = await q;
  const docs = data ?? [];

  const stats = docs.length
    ? await supabase.from("document_stats").select("document_id, views, last_viewed_at").in("document_id", docs.map((d) => d.id))
    : { data: [] as { document_id: string; views: number; last_viewed_at: string | null }[] };
  const byId = new Map((stats.data ?? []).map((s) => [s.document_id, s]));

  const rows: DocumentRow[] = docs.map((d) => {
    const client = Array.isArray(d.clients) ? d.clients[0] : d.clients;
    const s = byId.get(d.id);
    return {
      id: d.id, title: d.title, type: d.type as DocType, status: d.status, total_amount: d.total_amount, currency: d.currency,
      updated_at: d.updated_at, client_id: d.client_id, client_name: client?.company_name ?? null,
      views: s?.views ?? 0, last_viewed_at: s?.last_viewed_at ?? null,
    };
  });
  return { rows, total: count ?? 0 };
}

export const TYPE_ROUTE: Record<DocType, string> = { proposal: "proposals", quotation: "quotations", seo_audit: "seo-audits", social_audit: "social-audits", report: "proposals" };
export const TYPE_LABEL: Record<DocType, string> = { proposal: "Proposal", quotation: "Quotation", seo_audit: "SEO audit", social_audit: "Social media audit", report: "Report" };
export const documentHref = (type: DocType, id: string) => `/${TYPE_ROUTE[type]}/${id}`;

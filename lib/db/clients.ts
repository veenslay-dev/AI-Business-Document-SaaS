import "server-only";
import { createClient } from "@/lib/supabase/server";
import { likeTerm, PAGE_SIZE } from "./documents";

export type ClientRow = {
  id: string; company_name: string; contact_name: string | null; email: string | null; phone: string | null; website: string | null;
  industry: string | null; address: string | null; gst_number: string | null; notes: string | null; archived_at: string | null;
  created_at: string; updated_at: string;
};
const COLS = "id, company_name, contact_name, email, phone, website, industry, address, gst_number, notes, archived_at, created_at, updated_at";

export async function listClients(f: { workspaceId: string; q?: string; industry?: string; archived?: boolean; page?: number }) {
  const supabase = await createClient();
  const page = Math.max(1, f.page ?? 1);
  let q = supabase.from("clients").select(COLS, { count: "exact" }).eq("workspace_id", f.workspaceId)
    .order("company_name", { ascending: true }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  q = f.archived ? q.not("archived_at", "is", null) : q.is("archived_at", null);
  if (f.industry) q = q.eq("industry", f.industry);
  if (f.q?.trim()) {
    const t = likeTerm(f.q);
    q = q.or(`company_name.ilike.%${t}%,contact_name.ilike.%${t}%,email.ilike.%${t}%`);
  }
  const { data, count } = await q;
  return { rows: (data ?? []) as ClientRow[], total: count ?? 0 };
}

export async function getClient(workspaceId: string, id: string): Promise<ClientRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select(COLS).eq("workspace_id", workspaceId).eq("id", id).maybeSingle();
  return (data as ClientRow) ?? null;
}

export async function listIndustries(workspaceId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("industry").eq("workspace_id", workspaceId).not("industry", "is", null).limit(500);
  return [...new Set((data ?? []).map((r) => r.industry as string))].sort();
}

/** All active clients as {id, name} pairs for pickers. */
export async function clientOptions(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("id, company_name").eq("workspace_id", workspaceId).is("archived_at", null)
    .order("company_name").limit(500);
  return (data ?? []).map((c) => ({ id: c.id as string, name: c.company_name as string }));
}

type ProjectRow = { id: string; name: string; description: string | null; status: string; client_id: string; client_name: string | null; created_at: string };
export async function listProjects(f: { workspaceId: string; clientId?: string; page?: number }) {
  const supabase = await createClient();
  const page = Math.max(1, f.page ?? 1);
  let q = supabase.from("projects").select("id, name, description, status, client_id, created_at, clients(company_name)", { count: "exact" })
    .eq("workspace_id", f.workspaceId).order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (f.clientId) q = q.eq("client_id", f.clientId);
  const { data, count } = await q;
  const rows: ProjectRow[] = (data ?? []).map((p) => {
    const c = Array.isArray(p.clients) ? p.clients[0] : p.clients;
    return { id: p.id, name: p.name, description: p.description, status: p.status, client_id: p.client_id, client_name: c?.company_name ?? null, created_at: p.created_at };
  });
  return { rows, total: count ?? 0 };
}

export async function getProject(workspaceId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("id, name, description, status, client_id").eq("workspace_id", workspaceId).eq("id", id).maybeSingle();
  return data;
}

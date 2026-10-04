import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { firstUserId } from "@/lib/auth/admin";
import { PLANS, PLAN_ORDER, effectivePlan, type PlanId } from "@/lib/billing/plans";
import { costRates, estimateCostUsd } from "@/lib/billing/ai-cost";

export type AdminWorkspace = {
  id: string; name: string; created_at: string; owner_email: string | null; plan: string; status: string; limits: Record<string, unknown> | null; note: string | null;
  members: number; documents_month: number; documents_total: number; ai_month: number; tokens_in_month: number; tokens_out_month: number;
};

const n = (v: unknown) => Number(v ?? 0);

export async function listAdminWorkspaces(): Promise<AdminWorkspace[]> {
  const { data, error } = await createAdminClient().rpc("admin_workspaces");
  if (error) { console.error("[admin] admin_workspaces failed", error.message); return []; }
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id), name: String(r.name), created_at: String(r.created_at), owner_email: (r.owner_email as string | null) ?? null,
    plan: String(r.plan), status: String(r.status), limits: (r.limits as Record<string, unknown> | null) ?? null, note: (r.note as string | null) ?? null,
    members: n(r.members), documents_month: n(r.documents_month), documents_total: n(r.documents_total),
    ai_month: n(r.ai_month), tokens_in_month: n(r.tokens_in_month), tokens_out_month: n(r.tokens_out_month),
  }));
}

type AttentionItem = { id: string; kind: "limit" | "loss" | "paused"; workspaceId: string; workspaceName: string; plan: string; text: string };

export type AdminOverview = {
  users: number; workspaces: number; documentsMonth: number; documentsTotal: number; aiMonth: number; tokensIn: number; tokensOut: number;
  aiCostUsd: number; attention: AttentionItem[]; byPlan: { plan: PlanId; count: number }[]; mrrInr: number; newMessages: number; recent: AdminWorkspace[];
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const admin = createAdminClient();
  const [rows, users, msgs] = await Promise.all([
    listAdminWorkspaces(),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);
  const byPlan = PLAN_ORDER.map((plan) => ({ plan, count: rows.filter((r) => r.plan === plan).length }));
  const tokensIn = rows.reduce((a, r) => a + r.tokens_in_month, 0), tokensOut = rows.reduce((a, r) => a + r.tokens_out_month, 0);
  const rates = costRates();
  const attention: AttentionItem[] = [];
  for (const w of rows) {
    const p = effectivePlan({ plan: w.plan, limits: w.limits, status: w.status });
    if (w.status === "suspended") { attention.push({ id: `p-${w.id}`, kind: "paused", workspaceId: w.id, workspaceName: w.name, plan: w.plan, text: "This workspace is paused." }); continue; }
    const aiPct = p.aiPerMonth ? w.ai_month / p.aiPerMonth : 0, docPct = p.monthlyDocuments ? w.documents_month / p.monthlyDocuments : 0;
    if (aiPct >= 0.8 || docPct >= 0.8) {
      const bits = [aiPct >= 0.8 ? `AI ${w.ai_month} of ${p.aiPerMonth}` : "", docPct >= 0.8 ? `documents ${w.documents_month} of ${p.monthlyDocuments}` : ""].filter(Boolean).join(", ");
      attention.push({ id: `l-${w.id}`, kind: "limit", workspaceId: w.id, workspaceName: w.name, plan: w.plan, text: `Close to the limit this month: ${bits}.` });
    }
    const cost = estimateCostUsd(w.tokens_in_month, w.tokens_out_month, rates) * rates.usdToInr;
    const price = PLANS[w.plan as PlanId]?.priceInr ?? 0;
    if (cost > price && cost >= 1) attention.push({ id: `c-${w.id}`, kind: "loss", workspaceId: w.id, workspaceName: w.name, plan: w.plan, text: `AI cost this month (₹${cost.toFixed(2)}) is more than the plan brings in (₹${price}).` });
  }
  return {
    attention,
    users: (users.data as { total?: number; users?: unknown[] } | null)?.total || (users.data as { users?: unknown[] } | null)?.users?.length || 0,
    workspaces: rows.length, documentsMonth: rows.reduce((a, r) => a + r.documents_month, 0), documentsTotal: rows.reduce((a, r) => a + r.documents_total, 0),
    aiMonth: rows.reduce((a, r) => a + r.ai_month, 0), tokensIn, tokensOut, aiCostUsd: estimateCostUsd(tokensIn, tokensOut),
    byPlan, mrrInr: rows.filter((r) => r.status === "active").reduce((a, r) => a + (PLANS[(r.plan as PlanId)]?.priceInr ?? 0), 0),
    newMessages: msgs.count ?? 0, recent: rows.slice(0, 5),
  };
}

type AdminUserWorkspace = { id: string; name: string; role: string; plan: string; status: string; limits: Record<string, unknown> | null; documents_month: number; ai_month: number };
export type AdminUser = {
  id: string; email: string; created_at: string; last_sign_in_at: string | null; confirmed: boolean; fullName: string; paused: boolean; isAdmin: boolean;
  workspaces: AdminUserWorkspace[];
};

async function withWorkspaces(users: { id: string; email?: string; created_at: string; last_sign_in_at?: string | null; email_confirmed_at?: string | null; banned_until?: string | null; user_metadata?: unknown }[]): Promise<AdminUser[]> {
  const admin = createAdminClient();
  const ids = users.map((u) => u.id);
  const [{ data: members }, rows, first] = await Promise.all([
    ids.length ? admin.from("workspace_members").select("user_id, workspace_id, role").in("user_id", ids) : Promise.resolve({ data: [] as { user_id: string; workspace_id: string; role: string }[] }),
    listAdminWorkspaces(), firstUserId(),
  ]);
  const ws = new Map(rows.map((r) => [r.id, r]));
  return users.map((u) => ({
    id: u.id, email: u.email ?? "", created_at: u.created_at, last_sign_in_at: u.last_sign_in_at ?? null, confirmed: !!u.email_confirmed_at,
    fullName: String((u.user_metadata as Record<string, unknown> | null)?.full_name ?? ""),
    paused: !!u.banned_until && new Date(u.banned_until).getTime() > Date.now(), isAdmin: first === u.id,
    workspaces: (members ?? []).filter((m) => m.user_id === u.id).flatMap((m) => {
      const w = ws.get(m.workspace_id); if (!w) return [];
      return [{ id: w.id, name: w.name, role: m.role, plan: w.plan, status: w.status, limits: w.limits, documents_month: w.documents_month, ai_month: w.ai_month }];
    }),
  }));
}

export async function listAdminUsers(page: number, perPage = 25, q = ""): Promise<{ users: AdminUser[]; total: number }> {
  const admin = createAdminClient();
  if (q.trim()) {
    // Search runs over the first 1000 accounts, which is plenty for now.
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const needle = q.trim().toLowerCase();
    const hits = (data?.users ?? []).filter((u) => (u.email ?? "").toLowerCase().includes(needle) || String((u.user_metadata as Record<string, unknown> | null)?.full_name ?? "").toLowerCase().includes(needle));
    return { users: await withWorkspaces(hits.slice((page - 1) * perPage, page * perPage)), total: hits.length };
  }
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
  if (error) return { users: [], total: 0 };
  return { total: (data as { total?: number }).total || data.users.length, users: await withWorkspaces(data.users) };
}

export async function getAdminUser(id: string): Promise<AdminUser | null> {
  const { data } = await createAdminClient().auth.admin.getUserById(id);
  if (!data.user) return null;
  return (await withWorkspaces([data.user]))[0] ?? null;
}

export type AdminMessage = {
  id: string; name: string; email: string; company: string | null; phone: string | null; topic: string; plan_interest: string | null; message: string;
  workspace_id: string | null; status: string; created_at: string; handled_at: string | null;
};
export async function listAdminMessages(status: "new" | "handled" | "all"): Promise<AdminMessage[]> {
  let q = createAdminClient().from("contact_messages").select("*").order("created_at", { ascending: false }).limit(200);
  if (status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as AdminMessage[];
}

export async function getAdminWorkspace(id: string) {
  const rows = await listAdminWorkspaces();
  const ws = rows.find((r) => r.id === id);
  if (!ws) return null;
  const admin = createAdminClient();
  const { data: members } = await admin.from("workspace_members").select("user_id, role, created_at").eq("workspace_id", id).order("created_at");
  const people = await Promise.all((members ?? []).map(async (m) => {
    const { data } = await admin.auth.admin.getUserById(m.user_id);
    return { userId: m.user_id as string, role: m.role as string, email: data.user?.email ?? "unknown", joined: m.created_at as string };
  }));
  const { data: messages } = await admin.from("contact_messages").select("id, topic, plan_interest, status, created_at").eq("workspace_id", id).order("created_at", { ascending: false }).limit(10);
  const { data: sub } = await admin.from("subscriptions").select("current_period_end").eq("workspace_id", id).maybeSingle();
  return { ws, people, messages: messages ?? [], periodEnd: (sub?.current_period_end as string | null) ?? null };
}

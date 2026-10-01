import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, PLAN_ORDER, type PlanId } from "@/lib/billing/plans";
import { estimateCostUsd } from "@/lib/billing/ai-cost";

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

export type AdminOverview = {
  users: number; workspaces: number; documentsMonth: number; documentsTotal: number; aiMonth: number; tokensIn: number; tokensOut: number;
  aiCostUsd: number; byPlan: { plan: PlanId; count: number }[]; mrrInr: number; newMessages: number; recent: AdminWorkspace[];
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
  return {
    users: (users.data as { total?: number; users?: unknown[] } | null)?.total || (users.data as { users?: unknown[] } | null)?.users?.length || 0,
    workspaces: rows.length, documentsMonth: rows.reduce((a, r) => a + r.documents_month, 0), documentsTotal: rows.reduce((a, r) => a + r.documents_total, 0),
    aiMonth: rows.reduce((a, r) => a + r.ai_month, 0), tokensIn, tokensOut, aiCostUsd: estimateCostUsd(tokensIn, tokensOut),
    byPlan, mrrInr: rows.filter((r) => r.status === "active").reduce((a, r) => a + (PLANS[(r.plan as PlanId)]?.priceInr ?? 0), 0),
    newMessages: msgs.count ?? 0, recent: rows.slice(0, 5),
  };
}

export type AdminUser = { id: string; email: string; created_at: string; last_sign_in_at: string | null; confirmed: boolean; fullName: string };
export async function listAdminUsers(page: number, perPage = 25): Promise<{ users: AdminUser[]; total: number }> {
  const { data, error } = await createAdminClient().auth.admin.listUsers({ page, perPage });
  if (error) return { users: [], total: 0 };
  return {
    total: (data as { total?: number }).total ?? data.users.length,
    users: data.users.map((u) => ({ id: u.id, email: u.email ?? "", created_at: u.created_at, last_sign_in_at: u.last_sign_in_at ?? null, confirmed: !!u.email_confirmed_at, fullName: String((u.user_metadata as Record<string, unknown> | null)?.full_name ?? "") })),
  };
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

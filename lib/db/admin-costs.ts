import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { costRates, estimateCostUsd } from "@/lib/billing/ai-cost";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { listAdminWorkspaces } from "./admin";

export const PERIODS = [
  { id: "month", label: "This month" }, { id: "last-month", label: "Last month" }, { id: "30d", label: "Last 30 days" }, { id: "all", label: "All time" },
] as const;
export type PeriodId = (typeof PERIODS)[number]["id"];

export function periodRange(id: PeriodId, now = new Date()): { from: string | null; to: string | null; label: string } {
  const startOfMonth = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const label = PERIODS.find((p) => p.id === id)?.label ?? "This month";
  if (id === "all") return { from: null, to: null, label };
  if (id === "30d") return { from: new Date(now.getTime() - 30 * 86_400_000).toISOString(), to: null, label };
  if (id === "last-month") { const to = startOfMonth(now); return { from: new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() - 1, 1)).toISOString(), to: to.toISOString(), label }; }
  return { from: startOfMonth(now).toISOString(), to: null, label };
}

export const parsePeriod = (v: string | undefined): PeriodId => (PERIODS.some((p) => p.id === v) ? (v as PeriodId) : "month");

type UsageRow = { user_id: string | null; workspace_id: string | null; operation: string; model: string; calls: number; tokens_in: number; tokens_out: number };

async function usage(from: string | null, to: string | null): Promise<UsageRow[]> {
  const { data, error } = await createAdminClient().rpc("admin_ai_usage", { p_from: from, p_to: to });
  if (error) { console.error("[admin] admin_ai_usage failed", error.message); return []; }
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    user_id: (r.user_id as string | null) ?? null, workspace_id: (r.workspace_id as string | null) ?? null, operation: String(r.operation), model: String(r.model),
    calls: Number(r.calls), tokens_in: Number(r.tokens_in), tokens_out: Number(r.tokens_out),
  }));
}

export type CostSummary = { calls: number; tokens: number; costInr: number; costUsd: number; avgInr: number };
export type UserCost = {
  userId: string; email: string; name: string; workspaces: { id: string; name: string; plan: string }[];
  calls: number; tokens: number; costInr: number; avgInr: number; planPriceInr: number; share: number; overPlan: boolean;
};
export type OperationCost = { operation: string; calls: number; tokens: number; costInr: number; avgInr: number };

const OPERATION_LABEL: Record<string, string> = {
  assist: "Rewrite a section", generate_proposal: "Draft a proposal", quotation_description: "Line item description", follow_up: "Follow-up message", audit_analysis: "Audit write-up",
};
export const operationLabel = (op: string) => OPERATION_LABEL[op] ?? op.replace(/_/g, " ");

export async function getAiCosts(period: PeriodId) {
  const range = periodRange(period);
  const rates = costRates();
  const inr = (i: number, o: number) => estimateCostUsd(i, o, rates) * rates.usdToInr;
  const admin = createAdminClient();
  const [rows, workspaces] = await Promise.all([usage(range.from, range.to), listAdminWorkspaces()]);

  const userIds = [...new Set(rows.map((r) => r.user_id).filter((x): x is string => !!x))];
  const [{ data: members }, listed] = await Promise.all([
    userIds.length ? admin.from("workspace_members").select("user_id, workspace_id, role").in("user_id", userIds) : Promise.resolve({ data: [] as { user_id: string; workspace_id: string; role: string }[] }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  const people = new Map((listed.data?.users ?? []).map((u) => [u.id, { email: u.email ?? "unknown", name: String((u.user_metadata as Record<string, unknown> | null)?.full_name ?? "") }]));
  const wsById = new Map(workspaces.map((w) => [w.id, w]));

  const total = rows.reduce((a, r) => ({ calls: a.calls + r.calls, i: a.i + r.tokens_in, o: a.o + r.tokens_out }), { calls: 0, i: 0, o: 0 });
  const costInr = inr(total.i, total.o);
  const summary: CostSummary = { calls: total.calls, tokens: total.i + total.o, costInr, costUsd: estimateCostUsd(total.i, total.o, rates), avgInr: total.calls ? costInr / total.calls : 0 };

  const byUserMap = new Map<string, { calls: number; i: number; o: number }>();
  for (const r of rows) { const k = r.user_id ?? "none"; const c = byUserMap.get(k) ?? { calls: 0, i: 0, o: 0 }; c.calls += r.calls; c.i += r.tokens_in; c.o += r.tokens_out; byUserMap.set(k, c); }
  const byUser: UserCost[] = [...byUserMap.entries()].map(([userId, c]) => {
    const mine = (members ?? []).filter((m) => m.user_id === userId);
    const owned = mine.filter((m) => m.role === "owner").map((m) => wsById.get(m.workspace_id)).filter((w) => !!w);
    const p = people.get(userId);
    const cost = inr(c.i, c.o);
    const planPriceInr = owned.reduce((a, w) => a + (PLANS[(w!.plan as PlanId)]?.priceInr ?? 0), 0);
    return {
      userId, email: p?.email ?? (userId === "none" ? "Deleted account" : "Unknown"), name: p?.name ?? "",
      workspaces: mine.map((m) => wsById.get(m.workspace_id)).filter((w) => !!w).map((w) => ({ id: w!.id, name: w!.name, plan: w!.plan })),
      calls: c.calls, tokens: c.i + c.o, costInr: cost, avgInr: c.calls ? cost / c.calls : 0, planPriceInr, share: costInr ? cost / costInr : 0,
      // Only meaningful for a month, since plans are priced per month.
      overPlan: (period === "month" || period === "last-month") && cost > planPriceInr,
    };
  }).sort((a, b) => b.costInr - a.costInr);

  const byOpMap = new Map<string, { calls: number; i: number; o: number }>();
  for (const r of rows) { const c = byOpMap.get(r.operation) ?? { calls: 0, i: 0, o: 0 }; c.calls += r.calls; c.i += r.tokens_in; c.o += r.tokens_out; byOpMap.set(r.operation, c); }
  const byOperation: OperationCost[] = [...byOpMap.entries()].map(([operation, c]) => ({ operation, calls: c.calls, tokens: c.i + c.o, costInr: inr(c.i, c.o), avgInr: c.calls ? inr(c.i, c.o) / c.calls : 0 })).sort((a, b) => b.costInr - a.costInr);

  return { range, rates, summary, byUser, byOperation };
}

/** Spreadsheet programs run cells that start with these characters as formulas, so they are defused. */
export const csvCell = (v: string | number): string => {
  const s = String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { aiAllowance, documentAllowance, effectivePlan, monthStartIso, type Allowance, type EffectivePlan } from "@/lib/billing/plans";

export type PlanUsage = {
  plan: EffectivePlan; status: string; periodEnd: string | null;
  documents: Allowance; ai: Allowance; members: number;
};

/** The workspace's plan with this month's usage. Read through the signed-in user's own access. */
export async function getPlanUsage(workspaceId: string): Promise<PlanUsage> {
  const supabase = await createClient();
  const start = monthStartIso();
  const [{ data: sub }, docs, ai, members] = await Promise.all([
    supabase.from("subscriptions").select("plan, limits, status, current_period_end").eq("workspace_id", workspaceId).maybeSingle(),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("created_at", start),
    supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).neq("operation", "audit_scan").gte("created_at", start),
    supabase.from("workspace_members").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
  ]);
  return {
    plan: effectivePlan(sub), status: sub?.status ?? "active", periodEnd: sub?.current_period_end ?? null,
    documents: documentAllowance(sub, docs.count ?? 0), ai: aiAllowance(sub, ai.count ?? 0), members: members.count ?? 0,
  };
}

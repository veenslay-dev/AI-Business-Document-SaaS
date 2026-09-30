import type { SupabaseClient } from "@supabase/supabase-js";

export const AI_LIMITS = { perWorkspaceHour: 60, perUserMinute: 8 } as const;

export type LimitState = { ok: true } | { ok: false; reason: "user" | "workspace" };

/** Pure decision so it can be tested without a database. */
export function decideLimit(counts: { workspaceLastHour: number; userLastMinute: number }): LimitState {
  if (counts.userLastMinute >= AI_LIMITS.perUserMinute) return { ok: false, reason: "user" };
  if (counts.workspaceLastHour >= AI_LIMITS.perWorkspaceHour) return { ok: false, reason: "workspace" };
  return { ok: true };
}

/** Counts recent AI calls from the ai_usage table (kept per workspace, protected by RLS). */
export async function checkAiLimit(supabase: SupabaseClient, workspaceId: string, userId: string): Promise<LimitState> {
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const [ws, me] = await Promise.all([
    supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).gte("created_at", hourAgo),
    supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).eq("user_id", userId).gte("created_at", minuteAgo),
  ]);
  return decideLimit({ workspaceLastHour: ws.count ?? 0, userLastMinute: me.count ?? 0 });
}

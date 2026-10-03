import "server-only";
import { getActiveMembership, getUser } from "@/lib/auth/session";
import { getWorkspaceBranding } from "@/lib/db/workspace";
import { aiAllowance, effectivePlan, enforcementOn, monthStartIso } from "@/lib/billing/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { BrandContext } from "@/lib/documents/branding";
import { selectKnowledge, type KnowledgeItem } from "./context";
import { checkAiLimit } from "./ratelimit";
import { getProvider } from "./providers";
import { AI_USER_MESSAGES, AiError, type AiProvider } from "./types";
import type { ActionResult } from "@/lib/actions/result";

export type AiContext = {
  provider: AiProvider;
  brand: BrandContext;
  workspaceId: string;
  /** Knowledge base entries relevant to a query. Empty when the knowledge base has none. */
  knowledge: (query: string) => Promise<KnowledgeItem[]>;
};

/**
 * Every AI call from the app goes through here: it checks the session and
 * workspace, plan, rate limit, records usage and turns failures into messages
 * that are safe to show. Server actions call this; components never do.
 */
export async function withAi<T>(operation: string, fn: (ctx: AiContext) => Promise<T>): Promise<ActionResult<T>> {
  const user = await getUser();
  const membership = await getActiveMembership();
  if (!user || !membership) return { ok: false, error: "Your session has expired. Please sign in again." };

  let finish: (refund: boolean) => Promise<void> = async () => undefined;
  try {
    const supabase = await createClient();
    const { data: sub } = await supabase.from("subscriptions").select("plan, limits, status, current_period_end").eq("workspace_id", membership.workspaceId).maybeSingle();
    // Only real AI calls count towards the plan. Website scans are logged in the same table for rate limiting.
    const { count: usedThisMonth } = await supabase.from("ai_usage").select("id", { count: "exact", head: true })
      .eq("workspace_id", membership.workspaceId).neq("operation", "audit_scan").gte("created_at", monthStartIso());
    const allowance = aiAllowance(sub, usedThisMonth ?? 0);
    if (!allowance.ok) {
      const plan = effectivePlan(sub);
      return { ok: false, error: allowance.reason === "suspended"
        ? "This workspace is paused. Contact support to restore access."
        : `You've used all ${allowance.limit} AI actions included in your ${plan.name} plan this month. Upgrade in Settings, then Subscription, for more.` };
    }

    const limit = await checkAiLimit(supabase, membership.workspaceId, user.id);
    if (!limit.ok) throw new AiError("rate_limited", limit.reason);

    const branding = await getWorkspaceBranding(membership.workspaceId);
    if (!branding) return { ok: false, error: "We couldn't load your company profile. Refresh and try again." };

    const provider = getProvider();
    // Record before calling so concurrent requests can't slip past the limit.
    const { data: usageRow } = await supabase.from("ai_usage").insert({ workspace_id: membership.workspaceId, user_id: user.id, operation, provider: provider.name }).select("id").single();
    // Two requests can pass the count above at the same moment. Count again now that our own row exists
    // and back out if this call went over the plan.
    if (usageRow?.id && enforcementOn()) {
      const { count: after } = await supabase.from("ai_usage").select("id", { count: "exact", head: true })
        .eq("workspace_id", membership.workspaceId).neq("operation", "audit_scan").gte("created_at", monthStartIso());
      if (!aiAllowance(sub, Math.max(0, (after ?? 1) - 1)).ok) {
        try { await createAdminClient().from("ai_usage").delete().eq("id", usageRow.id); } catch { /* the next check still holds */ }
        return { ok: false, error: `You've used all ${allowance.limit} AI actions included in your ${effectivePlan(sub).name} plan this month. Upgrade in Settings, then Subscription, for more.` };
      }
    }
    finish = async (refund: boolean) => {
      if (!usageRow?.id) return;
      try {
        const admin = createAdminClient();
        // A failed call doesn't cost the customer an AI action.
        if (refund) await admin.from("ai_usage").delete().eq("id", usageRow.id);
        else await admin.from("ai_usage").update({ input_tokens: provider.usage.input, output_tokens: provider.usage.output, model: provider.usage.model }).eq("id", usageRow.id);
      } catch { /* cost tracking must never break the user's request */ }
    };

    let kb: KnowledgeItem[] | null = null;
    const data = await fn({
      provider, brand: branding.context, workspaceId: membership.workspaceId,
      knowledge: async (query) => {
        if (!kb) {
          const { data: rows } = await supabase.from("knowledge_base_items").select("title, type, content")
            .eq("workspace_id", membership.workspaceId).order("updated_at", { ascending: false }).limit(200);
          kb = (rows ?? []) as KnowledgeItem[];
        }
        return selectKnowledge(kb, query);
      },
    });
    await finish(false);
    return { ok: true, data };
  } catch (e) {
    await finish(true);
    if (e instanceof AiError) return { ok: false, error: AI_USER_MESSAGES[e.code] };
    console.error("[ai] unexpected failure", e instanceof Error ? e.message : "unknown");
    return { ok: false, error: AI_USER_MESSAGES.provider_error };
  }
}

import "server-only";
import { getActiveMembership, getUser } from "@/lib/auth/session";
import { getWorkspaceBranding } from "@/lib/db/workspace";
import { allows } from "@/lib/billing/plans";
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

  try {
    const supabase = await createClient();
    const { data: sub } = await supabase.from("subscriptions").select("plan").eq("workspace_id", membership.workspaceId).maybeSingle();
    if (!allows(sub?.plan, "ai")) throw new AiError("plan_limit", "plan");

    const limit = await checkAiLimit(supabase, membership.workspaceId, user.id);
    if (!limit.ok) throw new AiError("rate_limited", limit.reason);

    const branding = await getWorkspaceBranding(membership.workspaceId);
    if (!branding) return { ok: false, error: "We couldn't load your company profile. Refresh and try again." };

    const provider = getProvider();
    // Record before calling so concurrent requests can't slip past the limit.
    await supabase.from("ai_usage").insert({ workspace_id: membership.workspaceId, user_id: user.id, operation, provider: provider.name });

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
    return { ok: true, data };
  } catch (e) {
    if (e instanceof AiError) return { ok: false, error: AI_USER_MESSAGES[e.code] };
    console.error("[ai] unexpected failure", e instanceof Error ? e.message : "unknown");
    return { ok: false, error: AI_USER_MESSAGES.provider_error };
  }
}

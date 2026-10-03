import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { canUsePremiumTemplates } from "@/lib/billing/plans";
import { getSystemTemplate } from "@/lib/documents/templates";

/** Returns an error message when the chosen built-in template is a paid one and the workspace is on a plan without it. */
export async function premiumTemplateError(supabase: SupabaseClient, workspaceId: string, templateKey: string | null | undefined): Promise<string | null> {
  const t = getSystemTemplate(templateKey);
  if (!t?.premium) return null;
  const { data: sub } = await supabase.from("subscriptions").select("plan, limits, status, current_period_end").eq("workspace_id", workspaceId).maybeSingle();
  return canUsePremiumTemplates(sub) ? null : `"${t.name} report" is a Pro template. Upgrade in Settings, then Subscription, or choose another template.`;
}

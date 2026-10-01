"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isPlatformAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, fromZod, GENERIC_ERROR, type ActionResult } from "./result";

const limitField = z.union([z.literal(""), z.coerce.number().int().min(0).max(1_000_000)]).optional();

const subscriptionSchema = z.object({
  workspaceId: z.string().uuid(),
  plan: z.enum(["free", "professional", "agency", "custom"]),
  status: z.enum(["active", "suspended"]),
  periodEnd: z.string().max(10).default(""),
  note: z.string().trim().max(1000).default(""),
  // Empty means "use the plan's default".
  monthlyDocuments: limitField, aiPerMonth: limitField, teamMembers: limitField,
  unlimitedDocuments: z.boolean().default(false), unlimitedTeam: z.boolean().default(false),
  premiumTemplates: z.enum(["default", "yes", "no"]).default("default"),
});
export type SubscriptionInput = z.input<typeof subscriptionSchema>;

/** Every admin action re-checks the caller on the server. */
export async function adminUpdateSubscriptionAction(input: SubscriptionInput): Promise<ActionResult> {
  if (!(await isPlatformAdmin())) return fail("Not allowed.");
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;

  const limits: Record<string, unknown> = {};
  const set = (k: string, val: unknown) => { if (val !== "" && val !== undefined) limits[k] = val; };
  if (v.unlimitedDocuments) limits.monthlyDocuments = null; else set("monthlyDocuments", v.monthlyDocuments);
  set("aiPerMonth", v.aiPerMonth);
  if (v.unlimitedTeam) limits.teamMembers = null; else set("teamMembers", v.teamMembers);
  if (v.premiumTemplates !== "default") limits.premiumTemplates = v.premiumTemplates === "yes";

  const periodEnd = v.periodEnd && /^\d{4}-\d{2}-\d{2}$/.test(v.periodEnd) ? `${v.periodEnd}T23:59:59Z` : null;
  const admin = createAdminClient();
  const { error } = await admin.from("subscriptions").upsert({
    workspace_id: v.workspaceId, plan: v.plan, status: v.status, limits: Object.keys(limits).length ? limits : null,
    note: v.note || null, current_period_end: periodEnd, provider: "manual",
  }, { onConflict: "workspace_id" });
  if (error) { console.error("[admin] subscription update failed", error.message); return fail(GENERIC_ERROR); }
  revalidatePath("/admin", "layout"); revalidatePath("/settings/subscription");
  return { ok: true, message: "Plan updated." };
}

export async function adminSetMessageStatusAction(id: string, status: "new" | "handled"): Promise<ActionResult> {
  if (!(await isPlatformAdmin())) return fail("Not allowed.");
  if (!z.string().uuid().safeParse(id).success) return fail("That message no longer exists.");
  const { error } = await createAdminClient().from("contact_messages").update({ status, handled_at: status === "handled" ? new Date().toISOString() : null }).eq("id", id);
  if (error) return fail(GENERIC_ERROR);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

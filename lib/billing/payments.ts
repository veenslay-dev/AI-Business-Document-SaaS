import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PLANS, YEARLY_MONTHS, type PlanId } from "./plans";

export type PaidPlan = Extract<PlanId, "professional" | "agency">;
export type Period = "monthly" | "yearly";
export const PAID_PLANS: PaidPlan[] = ["professional", "agency"];

/** What a plan costs for a period, in paise, decided on the server and never taken from the browser. */
export function amountPaise(plan: PaidPlan, period: Period): number {
  const monthly = PLANS[plan].priceInr ?? 0;
  return monthly * (period === "yearly" ? YEARLY_MONTHS : 1) * 100;
}

/** Adds whole months in UTC, keeping the day of the month where the month is long enough. */
export function addMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

type PaymentRow = { id: string; workspace_id: string; plan: PaidPlan; period: Period; amount_paise: number; status: string };

/**
 * Marks an order paid and switches the plan on. Safe to call twice (the checkout confirmation and the webhook both do):
 * only the first call changes anything. Buying the same plan again before it ends extends it from its current end date.
 */
export async function activatePayment(admin: SupabaseClient, orderId: string, paymentId: string, paidPaise?: number): Promise<{ ok: boolean; already?: boolean; workspaceId?: string }> {
  const { data } = await admin.from("payments").select("id, workspace_id, plan, period, amount_paise, status").eq("razorpay_order_id", orderId).maybeSingle();
  const pay = data as PaymentRow | null;
  if (!pay) return { ok: false };
  if (paidPaise !== undefined && paidPaise !== pay.amount_paise) { console.error("[payments] amount does not match the order"); return { ok: false }; }
  if (pay.status === "paid") return { ok: true, already: true, workspaceId: pay.workspace_id };

  // Only one caller wins this update, so the plan is extended once even if both confirmations arrive together.
  const { data: claimed } = await admin.from("payments").update({ status: "paid", razorpay_payment_id: paymentId, paid_at: new Date().toISOString() }).eq("id", pay.id).neq("status", "paid").select("id");
  if (!claimed?.length) return { ok: true, already: true, workspaceId: pay.workspace_id };

  try {
    const { data: sub } = await admin.from("subscriptions").select("plan, current_period_end").eq("workspace_id", pay.workspace_id).maybeSingle();
    const now = new Date();
    const stillRunning = sub?.plan === pay.plan && sub.current_period_end && new Date(sub.current_period_end) > now;
    const end = addMonths(stillRunning ? new Date(sub!.current_period_end as string) : now, pay.period === "yearly" ? 12 : 1);
    const { error } = await admin.from("subscriptions").upsert({ workspace_id: pay.workspace_id, plan: pay.plan, current_period_end: end.toISOString(), provider: "razorpay" }, { onConflict: "workspace_id" });
    if (error) throw new Error(error.message);
    return { ok: true, workspaceId: pay.workspace_id };
  } catch (e) {
    // Put the order back so a retry (or the webhook) can finish the job.
    await admin.from("payments").update({ status: "created", paid_at: null }).eq("id", pay.id);
    console.error("[payments] could not apply the plan", e instanceof Error ? e.message : "unknown");
    return { ok: false };
  }
}

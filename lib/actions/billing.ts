"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { activatePayment, amountPaise, PAID_PLANS } from "@/lib/billing/payments";
import { createRazorpayOrder, RazorpayError, razorpayConfigured, razorpayKeyId, verifyCheckoutSignature } from "@/lib/billing/razorpay";
import { actionContext } from "./context";
import { fail, GENERIC_ERROR, type ActionResult } from "./result";

const startSchema = z.object({ plan: z.enum(["professional", "agency"]), period: z.enum(["monthly", "yearly"]) });

export type CheckoutOrder = { orderId: string; keyId: string; amountPaise: number; planName: string; email: string };

/** Step 1: create a Razorpay order for the signed-in owner's own workspace. The price comes from the server. */
export async function startCheckoutAction(input: unknown): Promise<ActionResult<CheckoutOrder>> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success || !PAID_PLANS.includes(parsed.data.plan)) return fail("Choose a plan to continue.");
  const ctx = await actionContext("team:manage");
  if (!ctx.ok) return ctx.error;
  const keyId = razorpayKeyId();
  if (!razorpayConfigured() || !keyId) return fail("Online payment isn't switched on yet. Use the contact form and we'll set up your plan.");

  const { plan, period } = parsed.data;
  const amount = amountPaise(plan, period);
  try {
    const order = await createRazorpayOrder({
      amountPaise: amount, receipt: `pd_${Date.now().toString(36)}`,
      notes: { workspace_id: ctx.workspaceId, plan, period },
    });
    const { error } = await createAdminClient().from("payments").insert({
      workspace_id: ctx.workspaceId, user_id: ctx.user.id, plan, period, amount_paise: amount, razorpay_order_id: order.id,
    });
    if (error) { console.error("[billing] could not record the order", error.message); return fail(GENERIC_ERROR); }
    return { ok: true, data: { orderId: order.id, keyId, amountPaise: amount, planName: plan === "agency" ? "Agency" : "Professional", email: ctx.user.email ?? "" } };
  } catch (e) {
    if (e instanceof RazorpayError && e.status === 401) return fail("Online payment is set up incorrectly on our side (the payment keys were rejected). Please contact us and we'll sort it out.");
    if (e instanceof RazorpayError && e.status >= 400 && e.status < 500) return fail("The payment provider refused this order. Please contact us and we'll sort it out.");
    return fail("We couldn't reach the payment provider. Please try again in a moment.");
  }
}

const confirmSchema = z.object({ orderId: z.string().min(5).max(64), paymentId: z.string().min(5).max(64), signature: z.string().min(10).max(200) });

/** Step 2: the browser reports a finished payment. The signature proves Razorpay issued it, and the order must be this workspace's. */
export async function confirmPaymentAction(input: unknown): Promise<ActionResult> {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) return fail("We couldn't confirm that payment.");
  const ctx = await actionContext("team:manage");
  if (!ctx.ok) return ctx.error;
  const { orderId, paymentId, signature } = parsed.data;
  if (!verifyCheckoutSignature(orderId, paymentId, signature)) return fail("We couldn't verify that payment. If money was taken, contact us and we'll fix it quickly.");

  const admin = createAdminClient();
  const { data: row } = await admin.from("payments").select("workspace_id").eq("razorpay_order_id", orderId).maybeSingle();
  if (!row || row.workspace_id !== ctx.workspaceId) return fail("We couldn't confirm that payment.");
  const res = await activatePayment(admin, orderId, paymentId);
  if (!res.ok) return fail("Your payment went through but the plan didn't switch on yet. It will be applied automatically within a few minutes, or contact us.");
  revalidatePath("/settings/subscription");
  revalidatePath("/dashboard");
  return { ok: true, message: "Payment received. Your plan is now active." };
}

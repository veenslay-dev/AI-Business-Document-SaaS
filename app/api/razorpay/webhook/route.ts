import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { activatePayment } from "@/lib/billing/payments";
import { verifyWebhookSignature } from "@/lib/billing/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Entity = { id?: string; order_id?: string; amount?: number; status?: string };
type Event = { event?: string; payload?: { payment?: { entity?: Entity }; order?: { entity?: Entity } } };

/**
 * Razorpay calls this when a payment is captured. It backs up the in-browser confirmation, so a customer who closes the tab
 * right after paying still gets their plan. The signature is checked against the raw body before anything is read.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 200_000 || !verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let evt: Event;
  try { evt = JSON.parse(raw) as Event; } catch { return NextResponse.json({ error: "Bad request" }, { status: 400 }); }

  if (evt.event === "payment.captured" || evt.event === "order.paid") {
    const pay = evt.payload?.payment?.entity;
    const orderId = pay?.order_id ?? evt.payload?.order?.entity?.id;
    if (orderId && pay?.id) {
      const res = await activatePayment(createAdminClient(), orderId, pay.id, pay.amount);
      // A 500 makes Razorpay retry later, which is what we want when the plan couldn't be applied.
      if (!res.ok && res.workspaceId !== undefined) return NextResponse.json({ error: "Retry" }, { status: 500 });
    }
  } else if (evt.event === "payment.failed") {
    const pay = evt.payload?.payment?.entity;
    if (pay?.order_id) await createAdminClient().from("payments").update({ status: "failed", razorpay_payment_id: pay.id ?? null }).eq("razorpay_order_id", pay.order_id).eq("status", "created");
  }
  return NextResponse.json({ ok: true });
}

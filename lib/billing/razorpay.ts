import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay helpers. The key id is public (it is handed to the checkout window), the secret never leaves the server.
 * RAZORPAY_API_BASE only exists so tests can point at a fake server.
 */
const apiBase = () => (process.env.RAZORPAY_API_BASE ?? "https://api.razorpay.com").replace(/\/$/, "");

export const razorpayKeyId = (): string | null => process.env.RAZORPAY_KEY_ID?.trim() || null;
export const razorpayConfigured = (): boolean => !!(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());
export const razorpayMode = (): "live" | "test" | null => (!razorpayConfigured() ? null : process.env.RAZORPAY_KEY_ID!.trim().startsWith("rzp_live_") ? "live" : "test");

const same = (a: string, b: string): boolean => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
const hmac = (secret: string, payload: string) => createHmac("sha256", secret).update(payload).digest("hex");

/** Checks the signature Razorpay Checkout returns to the browser after a successful payment. */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret || !orderId || !paymentId || !signature) return false;
  return same(hmac(secret, `${orderId}|${paymentId}`), signature.trim().toLowerCase());
}

/** Checks the signature on a webhook call. It is computed over the exact raw request body. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  return same(hmac(secret, rawBody), signature.trim().toLowerCase());
}

export async function createRazorpayOrder(input: { amountPaise: number; receipt: string; notes: Record<string, string> }): Promise<{ id: string }> {
  const key = process.env.RAZORPAY_KEY_ID?.trim(), secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!key || !secret) throw new Error("razorpay not configured");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(`${apiBase()}/v1/orders`, {
      method: "POST", signal: ctrl.signal,
      headers: { "content-type": "application/json", authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}` },
      body: JSON.stringify({ amount: input.amountPaise, currency: "INR", receipt: input.receipt, notes: input.notes }),
    });
    if (!res.ok) { console.error(`[razorpay] order creation answered ${res.status}`); throw new Error("order failed"); }
    const data = (await res.json()) as { id?: string };
    if (!data.id) throw new Error("no order id");
    return { id: data.id };
  } finally { clearTimeout(timer); }
}

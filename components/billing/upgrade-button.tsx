"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { confirmPaymentAction, startCheckoutAction } from "@/lib/actions/billing";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayCtor = new (opts: Record<string, unknown>) => { open: () => void; on: (evt: string, cb: () => void) => void };
declare global { interface Window { Razorpay?: RazorpayCtor } }

function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

export function UpgradeButton({ plan, period, label }: { plan: "professional" | "agency"; period: "monthly" | "yearly"; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function pay() {
    setBusy(true); setMsg(null);
    try {
      const started = await startCheckoutAction({ plan, period });
      if (!started.ok || !started.data) { setMsg({ ok: false, text: started.ok ? "Something went wrong." : started.error }); setBusy(false); return; }
      const o = started.data;
      if (!(await loadCheckout()) || !window.Razorpay) { setMsg({ ok: false, text: "Couldn't load the payment window. Check your connection and try again." }); setBusy(false); return; }
      const rz = new window.Razorpay({
        key: o.keyId, order_id: o.orderId, amount: o.amountPaise, currency: "INR",
        name: "PrioDraft", description: `${o.planName} plan, ${period}`, prefill: { email: o.email }, theme: { color: "#C8102E" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (r: RazorpayResponse) => {
          const done = await confirmPaymentAction({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature });
          setMsg({ ok: done.ok, text: done.ok ? (done.message ?? "Payment received.") : done.error });
          setBusy(false);
          if (done.ok) router.refresh();
        },
      });
      rz.on("payment.failed", () => { setMsg({ ok: false, text: "The payment didn't go through. You haven't been charged, or the bank will refund it." }); setBusy(false); });
      rz.open();
    } catch {
      setMsg({ ok: false, text: "Something went wrong. Please try again." }); setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <Button type="button" className="w-full" onClick={pay} disabled={busy}>{busy ? "Opening payment..." : label}</Button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "mt-2 text-xs text-ok" : "mt-2 text-xs text-signal"}>{msg.text}</p>}
    </div>
  );
}

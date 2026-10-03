import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { verifyCheckoutSignature, verifyWebhookSignature } from "@/lib/billing/razorpay";
import { addMonths, amountPaise } from "@/lib/billing/payments";
import { documentAllowance, effectivePlan } from "@/lib/billing/plans";

const sign = (secret: string, body: string) => createHmac("sha256", secret).update(body).digest("hex");

describe("razorpay signatures", () => {
  beforeEach(() => { process.env.RAZORPAY_KEY_SECRET = "sk_test"; process.env.RAZORPAY_WEBHOOK_SECRET = "whsec"; });
  it("accepts a genuine checkout signature and rejects a forged one", () => {
    expect(verifyCheckoutSignature("order_1", "pay_1", sign("sk_test", "order_1|pay_1"))).toBe(true);
    expect(verifyCheckoutSignature("order_1", "pay_2", sign("sk_test", "order_1|pay_1"))).toBe(false);
    expect(verifyCheckoutSignature("order_1", "pay_1", "")).toBe(false);
  });
  it("checks the webhook over the raw body", () => {
    const body = '{"event":"payment.captured"}';
    expect(verifyWebhookSignature(body, sign("whsec", body))).toBe(true);
    expect(verifyWebhookSignature(body + " ", sign("whsec", body))).toBe(false);
    expect(verifyWebhookSignature(body, null)).toBe(false);
  });
  it("fails closed when secrets are missing", () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET; delete process.env.RAZORPAY_KEY_SECRET;
    expect(verifyWebhookSignature("x", sign("", "x"))).toBe(false);
    expect(verifyCheckoutSignature("o", "p", sign("", "o|p"))).toBe(false);
  });
});

describe("amounts and expiry", () => {
  it("prices come from the plan table in paise", () => {
    expect(amountPaise("professional", "monthly") % 100).toBe(0);
    expect(amountPaise("professional", "yearly")).toBe(amountPaise("professional", "monthly") * 10);
  });
  it("adds months without spilling into the next one", () => {
    expect(addMonths(new Date("2026-01-31T00:00:00Z"), 1).toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(addMonths(new Date("2026-03-15T00:00:00Z"), 12).toISOString().slice(0, 10)).toBe("2027-03-15");
  });
  it("a paid plan past its end date falls back to Free", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString(), next = new Date(Date.now() + 86_400_000).toISOString();
    expect(effectivePlan({ plan: "professional", current_period_end: past }).id).toBe("free");
    expect(effectivePlan({ plan: "professional", current_period_end: past }).expiredOn).toBe(past);
    expect(effectivePlan({ plan: "professional", current_period_end: next }).id).toBe("professional");
    expect(effectivePlan({ plan: "professional" }).id).toBe("professional");
    expect(documentAllowance({ plan: "professional", current_period_end: past }, 10).ok).toBe(false);
  });
});

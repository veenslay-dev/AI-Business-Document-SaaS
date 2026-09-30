/**
 * Payment provider boundary. Stripe or Razorpay implement this later; nothing
 * else in the app should import a payment SDK directly.
 */
export interface BillingProvider {
  readonly name: string;
  createCheckoutUrl(input: { workspaceId: string; plan: string; email: string; returnUrl: string }): Promise<string>;
  createPortalUrl(input: { workspaceId: string; customerId: string; returnUrl: string }): Promise<string>;
}

export function getBillingProvider(): BillingProvider | null {
  return null; // not connected yet
}

export type PlanId = "free" | "professional" | "agency";

export type PlanFeatures = {
  name: string;
  monthlyDocuments: number | null; // null = unlimited
  ai: boolean;
  customBranding: boolean;
  sharing: boolean;
  tracking: boolean;
  teamMembers: number | null;
  audits: boolean;
  whiteLabel: boolean;
};

export const PLANS: Record<PlanId, PlanFeatures> = {
  free: { name: "Free", monthlyDocuments: 3, ai: false, customBranding: false, sharing: true, tracking: false, teamMembers: 1, audits: false, whiteLabel: false },
  professional: { name: "Professional", monthlyDocuments: null, ai: true, customBranding: true, sharing: true, tracking: true, teamMembers: 3, audits: false, whiteLabel: false },
  agency: { name: "Agency", monthlyDocuments: null, ai: true, customBranding: true, sharing: true, tracking: true, teamMembers: null, audits: true, whiteLabel: true },
};

/**
 * Plan limits are only enforced when BILLING_ENFORCEMENT=on. Until a payment
 * provider is connected every workspace is on the free plan, so enforcement
 * stays off by default and the limits are visible but not blocking.
 */
export const enforcementOn = () => process.env.BILLING_ENFORCEMENT === "on";

export function planOf(id: string | null | undefined): PlanFeatures {
  return PLANS[(id as PlanId) in PLANS ? (id as PlanId) : "free"];
}

export function allows(planId: string | null | undefined, feature: "ai" | "audits"): boolean {
  return !enforcementOn() || planOf(planId)[feature];
}

export function withinDocumentLimit(planId: string | null | undefined, usedThisMonth: number): boolean {
  if (!enforcementOn()) return true;
  const limit = planOf(planId).monthlyDocuments;
  return limit === null || usedThisMonth < limit;
}

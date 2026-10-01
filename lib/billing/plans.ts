export type PlanId = "free" | "professional" | "agency" | "custom";

export type PlanFeatures = {
  name: string;
  /** Monthly price in INR and USD for the monthly plan. Yearly billing is 10 months for 12. Null means "talk to us". */
  priceInr: number | null;
  priceUsd: number | null;
  monthlyDocuments: number | null; // null = unlimited
  /** AI actions per calendar month (each assist, draft or audit write-up counts as one). */
  aiPerMonth: number;
  teamMembers: number | null;
  premiumTemplates: boolean;
  support: string;
};

export const PLANS: Record<PlanId, PlanFeatures> = {
  free: { name: "Free", priceInr: 0, priceUsd: 0, monthlyDocuments: 10, aiPerMonth: 3, teamMembers: 1, premiumTemplates: false, support: "Community" },
  professional: { name: "Pro", priceInr: 999, priceUsd: 12, monthlyDocuments: 100, aiPerMonth: 150, teamMembers: 3, premiumTemplates: true, support: "Email support" },
  agency: { name: "Agency", priceInr: 2999, priceUsd: 35, monthlyDocuments: null, aiPerMonth: 600, teamMembers: 10, premiumTemplates: true, support: "Priority support" },
  // Custom limits are set per workspace by the admin. These are only the starting values.
  custom: { name: "Custom", priceInr: null, priceUsd: null, monthlyDocuments: null, aiPerMonth: 2000, teamMembers: null, premiumTemplates: true, support: "Dedicated support" },
};

export const YEARLY_MONTHS = 10;
export const PLAN_ORDER: PlanId[] = ["free", "professional", "agency", "custom"];

/**
 * Plan limits are enforced by default. Set BILLING_ENFORCEMENT=off to switch them off,
 * for example in a local demo.
 */
export const enforcementOn = () => process.env.BILLING_ENFORCEMENT !== "off";

export type SubLike = { plan?: string | null; limits?: unknown; status?: string | null } | null | undefined;

export type EffectivePlan = PlanFeatures & { id: PlanId; suspended: boolean };

const num = (v: unknown): number | null | undefined => (v === null ? null : typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : undefined);

/** The plan a workspace actually gets: the plan defaults, then any per-workspace limits the admin set. */
export function effectivePlan(sub: SubLike): EffectivePlan {
  const id: PlanId = sub?.plan && sub.plan in PLANS ? (sub.plan as PlanId) : "free";
  const base = { ...PLANS[id] };
  const o = (sub?.limits && typeof sub.limits === "object" ? sub.limits : {}) as Record<string, unknown>;
  const docs = num(o.monthlyDocuments), ai = num(o.aiPerMonth), team = num(o.teamMembers);
  if (docs !== undefined) base.monthlyDocuments = docs;
  if (ai !== undefined && ai !== null) base.aiPerMonth = ai;
  if (team !== undefined) base.teamMembers = team;
  if (typeof o.premiumTemplates === "boolean") base.premiumTemplates = o.premiumTemplates;
  return { ...base, id, suspended: sub?.status === "suspended" };
}

export function planOf(sub: SubLike): PlanFeatures { return effectivePlan(sub); }

export type Allowance = { ok: boolean; limit: number | null; used: number; reason?: "suspended" | "limit" };

export function documentAllowance(sub: SubLike, usedThisMonth: number): Allowance {
  const p = effectivePlan(sub);
  if (!enforcementOn()) return { ok: true, limit: p.monthlyDocuments, used: usedThisMonth };
  if (p.suspended) return { ok: false, limit: p.monthlyDocuments, used: usedThisMonth, reason: "suspended" };
  const ok = p.monthlyDocuments === null || usedThisMonth < p.monthlyDocuments;
  return { ok, limit: p.monthlyDocuments, used: usedThisMonth, reason: ok ? undefined : "limit" };
}

export function aiAllowance(sub: SubLike, usedThisMonth: number): Allowance {
  const p = effectivePlan(sub);
  if (!enforcementOn()) return { ok: true, limit: p.aiPerMonth, used: usedThisMonth };
  if (p.suspended) return { ok: false, limit: p.aiPerMonth, used: usedThisMonth, reason: "suspended" };
  const ok = usedThisMonth < p.aiPerMonth;
  return { ok, limit: p.aiPerMonth, used: usedThisMonth, reason: ok ? undefined : "limit" };
}

export const withinDocumentLimit = (sub: SubLike, usedThisMonth: number) => documentAllowance(sub, usedThisMonth).ok;
export const canUsePremiumTemplates = (sub: SubLike) => !enforcementOn() || effectivePlan(sub).premiumTemplates;

export const DOCUMENT_LIMIT_MESSAGE = "You've reached this month's document limit on your plan. Upgrade in Settings, then Subscription.";

export const monthStartIso = (): string => { const d = new Date(); d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0); return d.toISOString(); };

export function formatPlanPrice(id: PlanId, currency: "INR" | "USD", yearly: boolean): { amount: string; per: string; note: string } {
  const p = PLANS[id];
  const monthly = currency === "INR" ? p.priceInr : p.priceUsd;
  if (monthly === null) return { amount: "Custom", per: "", note: "Priced to fit your needs" };
  const sym = currency === "INR" ? "₹" : "$";
  const fmt = (n: number) => `${sym}${n.toLocaleString(currency === "INR" ? "en-IN" : "en-US")}`;
  if (monthly === 0) return { amount: fmt(0), per: "/month", note: "No card needed" };
  return yearly
    ? { amount: fmt(Math.round((monthly * YEARLY_MONTHS) / 12)), per: "/month", note: `Billed ${fmt(monthly * YEARLY_MONTHS)} a year. 2 months free.` }
    : { amount: fmt(monthly), per: "/month", note: "Billed monthly" };
}

export type PlanId = "free" | "professional" | "agency" | "custom";

export type PlanFeatures = {
  name: string;
  /** Monthly price in INR for the monthly plan. Yearly billing is 10 months for 12. Null means "talk to us". */
  priceInr: number | null;
  monthlyDocuments: number | null; // null = unlimited
  /** AI actions per calendar month (each assist, draft or audit write-up counts as one). */
  aiPerMonth: number;
  teamMembers: number | null;
  premiumTemplates: boolean;
  support: string;
};

export const PLANS: Record<PlanId, PlanFeatures> = {
  free: { name: "Free", priceInr: 0, monthlyDocuments: 10, aiPerMonth: 3, teamMembers: 1, premiumTemplates: false, support: "Community" },
  professional: { name: "Pro", priceInr: 999, monthlyDocuments: 100, aiPerMonth: 50, teamMembers: 3, premiumTemplates: true, support: "Email support" },
  agency: { name: "Agency", priceInr: 2999, monthlyDocuments: null, aiPerMonth: 200, teamMembers: 10, premiumTemplates: true, support: "Priority support" },
  // Custom limits are set per workspace by the admin. These are only the starting values.
  custom: { name: "Custom", priceInr: null, monthlyDocuments: null, aiPerMonth: 2000, teamMembers: null, premiumTemplates: true, support: "Dedicated support" },
};

export const YEARLY_MONTHS = 10;
export const PLAN_ORDER: PlanId[] = ["free", "professional", "agency", "custom"];

/**
 * Plan limits are enforced by default. Set BILLING_ENFORCEMENT=off to switch them off,
 * for example in a local demo.
 */
export const enforcementOn = () => process.env.BILLING_ENFORCEMENT !== "off";

export type SubLike = { plan?: string | null; limits?: unknown; status?: string | null; current_period_end?: string | null } | null | undefined;

/** `expiredOn` is set when a paid plan has run past its end date and the workspace has fallen back to Free. */
export type EffectivePlan = PlanFeatures & { id: PlanId; suspended: boolean; expiredOn: string | null };

const num = (v: unknown): number | null | undefined => (v === null ? null : typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : undefined);

/** The plan a workspace actually gets: the plan defaults, then any per-workspace limits the admin set. */
export function effectivePlan(sub: SubLike): EffectivePlan {
  const paid: PlanId = sub?.plan && sub.plan in PLANS ? (sub.plan as PlanId) : "free";
  // A paid plan with an end date that has passed behaves as Free until it is renewed.
  const ended = paid !== "free" && !!sub?.current_period_end && new Date(sub.current_period_end).getTime() < Date.now();
  const id: PlanId = ended ? "free" : paid;
  const base = { ...PLANS[id] };
  const o = (!ended && sub?.limits && typeof sub.limits === "object" ? sub.limits : {}) as Record<string, unknown>;
  const docs = num(o.monthlyDocuments), ai = num(o.aiPerMonth), team = num(o.teamMembers);
  if (docs !== undefined) base.monthlyDocuments = docs;
  if (ai !== undefined && ai !== null) base.aiPerMonth = ai;
  if (team !== undefined) base.teamMembers = team;
  if (typeof o.premiumTemplates === "boolean") base.premiumTemplates = o.premiumTemplates;
  return { ...base, id, suspended: sub?.status === "suspended", expiredOn: ended ? (sub!.current_period_end as string) : null };
}

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

export const canUsePremiumTemplates = (sub: SubLike) => !enforcementOn() || effectivePlan(sub).premiumTemplates;

export const DOCUMENT_LIMIT_MESSAGE = "You've reached this month's document limit on your plan. Upgrade in Settings, then Subscription.";

export const monthStartIso = (): string => { const d = new Date(); d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0); return d.toISOString(); };

export function formatPlanPrice(id: PlanId, yearly: boolean): { amount: string; per: string; note: string } {
  const p = PLANS[id];
  const monthly = p.priceInr;
  if (monthly === null) return { amount: "Custom", per: "", note: "Priced to fit your needs" };
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  if (monthly === 0) return { amount: fmt(0), per: "/month", note: "No card needed" };
  return yearly
    ? { amount: fmt(Math.round((monthly * YEARLY_MONTHS) / 12)), per: "/month", note: `Billed ${fmt(monthly * YEARLY_MONTHS)} a year. 2 months free.` }
    : { amount: fmt(monthly), per: "/month", note: "Billed monthly" };
}

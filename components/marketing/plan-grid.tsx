"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLAN_CARDS } from "@/lib/marketing";
import { UpgradeButton } from "@/components/billing/upgrade-button";
import { formatPlanPrice, PLAN_ORDER, type PlanId } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

/**
 * The plan cards, used on the public site and inside the app.
 * Inside the app, pass `currentPlan` so the right card says "Current plan" and the others link to the upgrade form.
 */
export function PlanGrid({ currentPlan, workspace, signedIn = false, onlinePayments = false, canPay = true }: { currentPlan?: PlanId; workspace?: string; signedIn?: boolean; onlinePayments?: boolean; canPay?: boolean }) {
  const [yearly, setYearly] = useState(false);
  const inApp = currentPlan !== undefined;

  const cta = (id: PlanId) => {
    const base = workspace ? `&workspace=${workspace}` : "";
    if (id === "custom") return { href: `/contact?topic=custom${base}`, label: "Contact us", primary: false };
    if (id === "free") return signedIn ? { href: "/dashboard", label: "Go to dashboard", primary: false } : { href: "/signup", label: "Start Free", primary: false };
    const label = inApp || signedIn ? "Upgrade" : `Get ${PLAN_CARDS.find((p) => p.id === id)?.name}`;
    // Signed-in owners upgrade from their subscription page, which knows their workspace.
    if (signedIn && !inApp) return { href: "/settings/subscription", label, primary: true };
    return { href: `/contact?topic=upgrade&plan=${id}${yearly ? "&billing=yearly" : ""}${base}`, label, primary: true };
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Toggle label="Billing period" options={[["monthly", "Monthly"], ["yearly", "Yearly (2 months free)"]]} value={yearly ? "yearly" : "monthly"} onChange={(v) => setYearly(v === "yearly")} />
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((id) => {
          const p = PLAN_CARDS.find((c) => c.id === id)!;
          const price = formatPlanPrice(id, yearly);
          const current = currentPlan === id;
          const c = cta(id);
          const lower = inApp && id !== "custom" && PLAN_ORDER.indexOf(id) < PLAN_ORDER.indexOf(currentPlan);
          return (
            <article key={id} className={cn("flex flex-col rounded-2xl border bg-surface p-7", p.highlight ? "border-2 border-brand shadow-pop xl:-mt-3 xl:pb-9" : "border-line shadow-soft", current && "ring-2 ring-brand/30")}>
              <h3 className="flex items-center justify-between font-bold">{p.name}
                {current ? <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand">Current plan</span>
                  : p.highlight ? <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-white">Most popular</span> : null}
              </h3>
              <p className="mt-3 text-4xl font-extrabold tabular-nums">{price.amount}<span className="text-base font-medium text-ink-faint">{price.per}</span></p>
              <p className="text-xs text-ink-faint">{price.note}</p>
              <p className="mt-3 text-sm text-ink-soft">{p.blurb}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">{p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />{f}</li>)}</ul>
              {current ? <Button className="mt-6" variant="secondary" disabled>Your current plan</Button>
                : lower ? <Button className="mt-6" variant="secondary" disabled>Included in your plan</Button>
                : onlinePayments && inApp && canPay && (id === "professional" || id === "agency") ? <UpgradeButton plan={id} period={yearly ? "yearly" : "monthly"} label={`Pay ${yearly ? "yearly" : "monthly"} and upgrade`} />
                : <Button asChild className="mt-6" variant={c.primary && p.highlight ? "primary" : c.primary ? "primary" : "secondary"}><Link href={c.href}>{c.label}</Link></Button>}
            </article>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-ink-faint">Prices exclude taxes where they apply. AI actions reset on the first of each month. Unused actions don't roll over.</p>
    </div>
  );
}

function Toggle({ label, options, value, onChange }: { label: string; options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-full border border-line-strong bg-surface p-1 text-sm shadow-soft">
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
          className={cn("rounded-full px-4 py-1.5 font-medium transition-colors", value === v ? "bg-brand text-white" : "text-ink-soft hover:text-ink")}>{l}</button>
      ))}
    </div>
  );
}

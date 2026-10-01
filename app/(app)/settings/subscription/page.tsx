import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanGrid } from "@/components/marketing/plan-grid";
import { requireWorkspace } from "@/lib/auth/session";
import { getPlanUsage } from "@/lib/db/billing";
import { formatDate } from "@/lib/documents/util";

export const metadata: Metadata = { title: "Subscription" };
export const dynamic = "force-dynamic";

function Meter({ label, used, limit, unit }: { label: string; used: number; limit: number | null; unit: string }) {
  const pct = limit === null ? 0 : Math.min(100, (used / Math.max(limit, 1)) * 100);
  const near = limit !== null && pct >= 80;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-ink-soft">{used} of {limit === null ? "unlimited" : limit} {unit}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-black/5" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={limit ?? undefined} aria-valuenow={used}>
        <div className={near ? "h-full rounded-full bg-signal" : "h-full rounded-full bg-brand"} style={{ width: limit === null ? "6%" : `${Math.max(pct, used > 0 ? 3 : 0)}%` }} />
      </div>
    </div>
  );
}

export default async function SubscriptionPage() {
  const { membership } = await requireWorkspace();
  const u = await getPlanUsage(membership.workspaceId);
  const p = u.plan;
  const canUpgrade = membership.role === "owner" || membership.role === "admin";

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-2xl border border-line bg-surface p-6 shadow-soft lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold">{p.name} plan</h2>
            <Badge tone={u.status === "suspended" ? "signal" : "ok"}>{u.status === "suspended" ? "paused" : "active"}</Badge>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            {p.id === "free" ? "You're on the free plan. Upgrade for more documents, more AI and more team members."
              : u.periodEnd ? `Renews or ends on ${formatDate(u.periodEnd)}.` : "Your plan is active."}
          </p>
          {u.status === "suspended" && <p role="alert" className="mt-3 rounded-lg bg-signal-soft px-3 py-2 text-sm text-signal">This workspace is paused, so new documents and AI are switched off. Contact us to restore access.</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            {canUpgrade && p.id !== "agency" && p.id !== "custom" && <Button asChild><Link href={`/contact?topic=upgrade&plan=${p.id === "free" ? "professional" : "agency"}&workspace=${membership.workspaceId}`}>Upgrade plan</Link></Button>}
            <Button asChild variant="secondary"><Link href={`/contact?topic=custom&workspace=${membership.workspaceId}`}>Need something custom?</Link></Button>
          </div>
          {!canUpgrade && <p className="mt-3 text-xs text-ink-faint">Only owners and admins can change the plan.</p>}
        </div>
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Usage this month</p>
          <Meter label="Documents created" used={u.documents.used} limit={u.documents.limit} unit="documents" />
          <Meter label="AI actions" used={u.ai.used} limit={u.ai.limit} unit="actions" />
          <Meter label="Team members" used={u.members} limit={p.teamMembers} unit="people" />
          <p className="text-xs text-ink-faint">Documents and AI actions reset on the first of each month.</p>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-xl font-bold">Compare plans</h2>
        <p className="mb-6 text-sm text-ink-soft">Choose a plan and we'll confirm the payment details with you, then switch it on for this workspace.</p>
        <PlanGrid currentPlan={p.id} workspace={membership.workspaceId} />
      </section>
    </div>
  );
}

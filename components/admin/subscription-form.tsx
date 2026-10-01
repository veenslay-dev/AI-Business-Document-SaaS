"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { adminUpdateSubscriptionAction } from "@/lib/actions/admin";
import { PLANS, type PlanId } from "@/lib/billing/plans";

type Initial = { workspaceId: string; plan: string; status: string; periodEnd: string; note: string; limits: Record<string, unknown> | null };

export function SubscriptionForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const l = initial.limits ?? {};
  const [v, setV] = useState({
    plan: initial.plan as PlanId, status: initial.status, periodEnd: initial.periodEnd, note: initial.note,
    monthlyDocuments: typeof l.monthlyDocuments === "number" ? String(l.monthlyDocuments) : "", unlimitedDocuments: l.monthlyDocuments === null,
    aiPerMonth: typeof l.aiPerMonth === "number" ? String(l.aiPerMonth) : "", teamMembers: typeof l.teamMembers === "number" ? String(l.teamMembers) : "", unlimitedTeam: l.teamMembers === null,
    premiumTemplates: typeof l.premiumTemplates === "boolean" ? (l.premiumTemplates ? "yes" : "no") : "default",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));
  const p = PLANS[v.plan];

  function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    start(async () => {
      try {
        const res = await adminUpdateSubscriptionAction({ workspaceId: initial.workspaceId, ...v, plan: v.plan, status: v.status as "active" | "suspended", premiumTemplates: v.premiumTemplates as "default" | "yes" | "no" });
        if (res.ok) { toast.success(res.message ?? "Saved."); router.refresh(); } else setError(res.error);
      } catch { setError("We couldn't reach the server."); }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-soft">
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Plan" htmlFor="a-plan"><Select id="a-plan" value={v.plan} onChange={(e) => set("plan", e.target.value as PlanId)}>{(Object.keys(PLANS) as PlanId[]).map((id) => <option key={id} value={id}>{PLANS[id].name}</option>)}</Select></Field>
        <Field label="Status" htmlFor="a-status" hint="Paused blocks new documents and AI."><Select id="a-status" value={v.status} onChange={(e) => set("status", e.target.value)}><option value="active">Active</option><option value="suspended">Paused</option></Select></Field>
        <Field label="Paid until" htmlFor="a-end" hint="For your own tracking."><Input id="a-end" type="date" value={v.periodEnd} onChange={(e) => set("periodEnd", e.target.value)} /></Field>
      </div>
      <fieldset className="rounded-xl border border-line p-4">
        <legend className="px-2 text-sm font-semibold">Limits for this workspace</legend>
        <p className="mb-3 text-xs text-ink-faint">Leave a box empty to use the plan's own number ({p.name}: {p.monthlyDocuments ?? "unlimited"} documents, {p.aiPerMonth} AI actions, {p.teamMembers ?? "unlimited"} team members).</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Documents per month" htmlFor="a-docs"><Input id="a-docs" type="number" min={0} value={v.monthlyDocuments} disabled={v.unlimitedDocuments} onChange={(e) => set("monthlyDocuments", e.target.value)} />
            <label className="mt-2 flex items-center gap-2 text-xs text-ink-soft"><input type="checkbox" checked={v.unlimitedDocuments} onChange={(e) => set("unlimitedDocuments", e.target.checked)} />Unlimited</label></Field>
          <Field label="AI actions per month" htmlFor="a-ai"><Input id="a-ai" type="number" min={0} value={v.aiPerMonth} onChange={(e) => set("aiPerMonth", e.target.value)} /></Field>
          <Field label="Team members" htmlFor="a-team"><Input id="a-team" type="number" min={0} value={v.teamMembers} disabled={v.unlimitedTeam} onChange={(e) => set("teamMembers", e.target.value)} />
            <label className="mt-2 flex items-center gap-2 text-xs text-ink-soft"><input type="checkbox" checked={v.unlimitedTeam} onChange={(e) => set("unlimitedTeam", e.target.checked)} />Unlimited</label></Field>
          <Field label="Premium templates" htmlFor="a-prem"><Select id="a-prem" value={v.premiumTemplates} onChange={(e) => set("premiumTemplates", e.target.value)}><option value="default">Plan default</option><option value="yes">Allowed</option><option value="no">Not allowed</option></Select></Field>
        </div>
      </fieldset>
      <Field label="Private note" htmlFor="a-note" hint="Only you see this. For example: paid by UPI on 3 Oct, ref 1234."><Textarea id="a-note" rows={3} value={v.note} onChange={(e) => set("note", e.target.value)} /></Field>
      <Button type="submit" loading={pending}>Save plan</Button>
    </form>
  );
}

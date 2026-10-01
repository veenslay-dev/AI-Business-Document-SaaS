import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MemberManager } from "@/components/admin/user-controls";
import { SubscriptionForm } from "@/components/admin/subscription-form";
import { Badge } from "@/components/ui/badge";
import { costRates, estimateCostUsd } from "@/lib/billing/ai-cost";
import { effectivePlan } from "@/lib/billing/plans";
import { getAdminWorkspace } from "@/lib/db/admin";
import { z } from "zod";

export default async function AdminWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const data = await getAdminWorkspace(id);
  if (!data) notFound();
  const { ws, people, messages, periodEnd } = data;
  const p = effectivePlan({ plan: ws.plan, limits: ws.limits, status: ws.status });
  const cost = estimateCostUsd(ws.tokens_in_month, ws.tokens_out_month) * costRates().usdToInr;

  return (
    <div className="space-y-6">
      <Link href="/admin/workspaces" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-brand"><ArrowLeft className="size-4" aria-hidden />All workspaces</Link>
      <div className="flex flex-wrap items-center gap-3"><h2 className="text-2xl font-extrabold">{ws.name}</h2><Badge tone={ws.plan === "free" ? "neutral" : "brand"}>{p.name}</Badge>{ws.status === "suspended" && <Badge tone="signal">paused</Badge>}</div>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[["Owner", ws.owner_email ?? "-"], ["Documents this month", `${ws.documents_month} / ${p.monthlyDocuments ?? "unlimited"}`], ["AI this month", `${ws.ai_month} / ${p.aiPerMonth}`], ["Est. AI cost this month", `₹${cost.toFixed(2)}`]].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-line bg-surface p-4 shadow-soft"><dt className="text-xs text-ink-faint">{k}</dt><dd className="mt-1 break-words text-lg font-bold">{v}</dd></div>
        ))}
      </dl>
      <SubscriptionForm initial={{ workspaceId: ws.id, plan: ws.plan, status: ws.status, periodEnd: periodEnd ? periodEnd.slice(0, 10) : "", note: ws.note ?? "", limits: ws.limits }} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-6 shadow-soft">
          <h3 className="font-bold">People ({people.length})</h3>
          <div className="mt-3"><MemberManager workspaceId={ws.id} people={people} /></div>
        </section>
        <section className="rounded-2xl border border-line bg-surface p-6 shadow-soft">
          <h3 className="font-bold">Messages from this workspace</h3>
          {messages.length === 0 ? <p className="mt-3 text-sm text-ink-soft">None yet.</p> : (
            <ul className="mt-3 divide-y divide-line text-sm">{messages.map((m) => <li key={m.id} className="flex items-center justify-between py-2"><span className="capitalize">{m.topic}{m.plan_interest ? `, ${m.plan_interest}` : ""}</span><Badge tone={m.status === "new" ? "brand" : "neutral"}>{m.status}</Badge></li>)}</ul>
          )}
          <Link href="/admin/messages" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">Open inbox</Link>
        </section>
      </div>
    </div>
  );
}

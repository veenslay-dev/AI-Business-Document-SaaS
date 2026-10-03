import Link from "next/link";
import { Activity, Building2, FileText, IndianRupee, Inbox, Sparkles, TriangleAlert, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { QuickPlanSelect } from "@/components/admin/user-controls";
import { getAdminOverview } from "@/lib/db/admin";
import { getAiCosts } from "@/lib/db/admin-costs";
import { costRates } from "@/lib/billing/ai-cost";
import { PLANS } from "@/lib/billing/plans";
import { timeAgo } from "@/lib/time";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default async function AdminOverviewPage() {
  const [o, allTime] = await Promise.all([getAdminOverview(), getAiCosts("all")]);
  const rates = costRates();
  const costInr = o.aiCostUsd * rates.usdToInr;
  const profit = o.mrrInr - costInr;
  const cards = [
    { label: "Users", value: o.users, icon: Users }, { label: "Workspaces", value: o.workspaces, icon: Building2 }, { label: "OpenAI spend, all time", value: inr(allTime.summary.costInr), icon: Wallet },
    { label: "Documents this month", value: o.documentsMonth, icon: FileText }, { label: "AI actions this month", value: o.aiMonth, icon: Sparkles },
    { label: "Est. monthly revenue", value: inr(o.mrrInr), icon: IndianRupee }, { label: "OpenAI spend this month", value: inr(costInr), icon: Wallet },
  ];
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-7" aria-label="Totals">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
            <span aria-hidden className="mb-3 grid size-10 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="size-[18px]" /></span>
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      <section aria-label="Needs attention" className="rounded-2xl border border-line bg-surface p-6 shadow-soft">
        <h2 className="flex items-center gap-2 font-bold"><TriangleAlert className="size-4 text-brand" aria-hidden />Needs attention</h2>
        {o.newMessages === 0 && o.attention.length === 0 ? <p className="mt-3 text-sm text-ink-soft">Nothing needs you right now.</p> : (
          <ul className="mt-4 divide-y divide-line text-sm">
            {o.newMessages > 0 && <li className="flex flex-wrap items-center justify-between gap-3 py-3"><span><strong>{o.newMessages} new message{o.newMessages === 1 ? "" : "s"}</strong> in the inbox, including upgrade requests.</span><Link href="/admin/messages" className="font-semibold text-brand hover:underline">Open inbox</Link></li>}
            {o.attention.slice(0, 12).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span><Link href={`/admin/workspaces/${a.workspaceId}`} className="font-semibold hover:text-brand">{a.workspaceName}</Link>{" "}<Badge tone={a.kind === "limit" ? "warn" : "signal"}>{a.kind === "limit" ? "limit" : a.kind === "loss" ? "costs more than it earns" : "paused"}</Badge><span className="mt-0.5 block text-ink-soft">{a.text}</span></span>
                {a.kind !== "paused" && <span className="flex items-center gap-2"><QuickPlanSelect workspaceId={a.workspaceId} plan={a.plan} /><Link href={`/admin/workspaces/${a.workspaceId}`} className="font-semibold text-brand hover:underline">Set limits</Link></span>}
              </li>
            ))}
          </ul>
        )}
        {o.attention.length > 12 && <p className="mt-2 text-xs text-ink-faint">And {o.attention.length - 12} more. See Workspaces.</p>}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-6 shadow-soft">
          <h2 className="flex items-center justify-between gap-2 font-bold"><span className="flex items-center gap-2"><Activity className="size-4 text-brand" aria-hidden />Money in and out</span><Link href="/admin/costs" className="text-sm font-semibold text-brand hover:underline">AI spend by user</Link></h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">Revenue (list price of active paid plans)</dt><dd className="font-semibold tabular-nums">{inr(o.mrrInr)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">AI cost ({(o.tokensIn + o.tokensOut).toLocaleString("en-IN")} tokens)</dt><dd className="font-semibold tabular-nums">- {inr(costInr)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2"><dt className="font-semibold">Estimated margin before other costs</dt><dd className={profit >= 0 ? "font-extrabold text-ok" : "font-extrabold text-signal"}>{inr(profit)}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-ink-faint">Revenue counts the monthly list price of each active paid workspace. Custom plans count as zero until you decide a price. AI cost uses the tokens saved with each call at the rates in Admin, Settings (US$ 1 = ₹{rates.usdToInr}). Treat both as estimates and check the real bills.</p>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-6 shadow-soft">
          <h2 className="font-bold">Workspaces by plan</h2>
          <ul className="mt-4 space-y-2">
            {o.byPlan.map(({ plan, count }) => (
              <li key={plan} className="flex items-center gap-3 text-sm">
                <span className="w-20 font-medium">{PLANS[plan].name}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-black/5"><span className="block h-full rounded-full bg-brand" style={{ width: `${o.workspaces ? (count / o.workspaces) * 100 : 0}%` }} /></span>
                <span className="w-8 text-right tabular-nums text-ink-soft">{count}</span>
              </li>
            ))}
          </ul>
          <Link href="/admin/messages" className="mt-5 flex items-center gap-2 rounded-xl bg-brand-soft px-4 py-3 text-sm font-semibold text-brand hover:bg-brand-soft/70">
            <Inbox className="size-4" aria-hidden />{o.newMessages} new message{o.newMessages === 1 ? "" : "s"} waiting
          </Link>
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Newest workspaces</h2><Link href="/admin/workspaces" className="text-sm font-semibold text-brand hover:underline">See all</Link></div>
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-line bg-paper text-[11px] uppercase tracking-wider text-ink-faint"><tr><th className="px-4 py-2.5">Workspace</th><th className="px-4 py-2.5">Owner</th><th className="px-4 py-2.5">Plan</th><th className="px-4 py-2.5">Created</th></tr></thead>
            <tbody className="divide-y divide-line">
              {o.recent.map((w) => (
                <tr key={w.id} className="hover:bg-brand-soft/30">
                  <td className="px-4 py-3 font-semibold"><Link href={`/admin/workspaces/${w.id}`} className="hover:text-brand">{w.name}</Link></td>
                  <td className="px-4 py-3 text-ink-soft">{w.owner_email ?? "-"}</td>
                  <td className="px-4 py-3"><Badge tone={w.plan === "free" ? "neutral" : "brand"}>{PLANS[w.plan as keyof typeof PLANS]?.name ?? w.plan}</Badge></td>
                  <td className="px-4 py-3 text-ink-soft">{timeAgo(w.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

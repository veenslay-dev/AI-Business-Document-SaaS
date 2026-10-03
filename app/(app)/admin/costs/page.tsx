import Link from "next/link";
import { AlertTriangle, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAiCosts, operationLabel, parsePeriod, PERIODS } from "@/lib/db/admin-costs";
import { PLANS } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: n < 100 ? 2 : 0, maximumFractionDigits: n < 100 ? 2 : 0 })}`;

export default async function AdminCostsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const period = parsePeriod((await searchParams).period);
  const { range, rates, summary, byUser, byOperation } = await getAiCosts(period);
  const losing = byUser.filter((u) => u.overPlan);
  const noTokens = summary.calls > 0 && summary.tokens === 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-line-strong bg-surface p-1 text-sm shadow-soft" role="group" aria-label="Period">
          {PERIODS.map((p) => <Link key={p.id} href={`/admin/costs?period=${p.id}`} aria-current={period === p.id ? "page" : undefined} className={cn("rounded-full px-4 py-1.5 font-medium", period === p.id ? "bg-brand text-white" : "text-ink-soft hover:text-ink")}>{p.label}</Link>)}
        </div>
        <Button asChild variant="secondary"><a href={`/admin/costs/export?period=${period}`}><Download className="size-4" aria-hidden />Download CSV</a></Button>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Totals">
        {[["Total AI spend", inr(summary.costInr)], ["AI actions", summary.calls.toLocaleString("en-IN")], ["Average per action", inr(summary.avgInr)], ["Tokens used", summary.tokens.toLocaleString("en-IN")]].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-line bg-surface p-5 shadow-soft"><p className="text-sm text-ink-soft">{k}</p><p className="mt-1 text-2xl font-extrabold tabular-nums">{v}</p><p className="mt-1 text-xs text-ink-faint">{range.label}</p></div>
        ))}
      </section>

      {noTokens && <p role="status" className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">Actions from before token tracking started have no cost recorded, so they show as ₹0. New actions are priced from the tokens OpenAI reports.</p>}
      {losing.length > 0 && (
        <div role="status" className="flex gap-3 rounded-xl bg-signal-soft px-4 py-3 text-sm text-[#7d2a16]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p><strong>{losing.length} account{losing.length === 1 ? "" : "s"}</strong> cost more in AI than their plan brings in: {losing.slice(0, 4).map((u) => u.email).join(", ")}{losing.length > 4 ? " and more" : ""}. Consider lowering their AI limit or moving them to a higher plan.</p>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">Spend by user</h2>
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-line bg-paper text-[11px] uppercase tracking-wider text-ink-faint">
              <tr><th className="px-4 py-2.5">User</th><th className="px-4 py-2.5">Workspace and plan</th><th className="px-4 py-2.5 text-right">Actions</th><th className="px-4 py-2.5 text-right">Spend</th><th className="px-4 py-2.5 text-right">Per action</th><th className="px-4 py-2.5 text-right">Share</th><th className="px-4 py-2.5 text-right">Plan price</th><th className="px-4 py-2.5"><span className="sr-only">Open</span></th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {byUser.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-ink-soft">No AI actions in this period.</td></tr>}
              {byUser.map((u) => (
                <tr key={u.userId} className={cn("hover:bg-brand-soft/30", u.overPlan && "bg-signal-soft/40")}>
                  <td className="px-4 py-3"><span className="font-semibold">{u.email}</span>{u.name && <div className="text-xs text-ink-soft">{u.name}</div>}</td>
                  <td className="px-4 py-3 text-ink-soft">{u.workspaces.length === 0 ? "-" : u.workspaces.slice(0, 2).map((w) => <div key={w.id}>{w.name} <Badge tone={w.plan === "free" ? "neutral" : "brand"}>{PLANS[w.plan as keyof typeof PLANS]?.name ?? w.plan}</Badge></div>)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{u.calls.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{inr(u.costInr)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{inr(u.avgInr)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{Math.round(u.share * 100)}%</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{u.planPriceInr ? inr(u.planPriceInr) : "Free"}</td>
                  <td className="px-4 py-3 text-right">{u.userId !== "none" && <Link href={`/admin/users/${u.userId}`} className="font-semibold text-brand hover:underline">Manage</Link>}</td>
                </tr>
              ))}
            </tbody>
            {byUser.length > 0 && <tfoot className="border-t-2 border-line bg-paper text-sm font-bold"><tr><td className="px-4 py-3" colSpan={2}>Total</td><td className="px-4 py-3 text-right tabular-nums">{summary.calls.toLocaleString("en-IN")}</td><td className="px-4 py-3 text-right tabular-nums">{inr(summary.costInr)}</td><td className="px-4 py-3 text-right tabular-nums">{inr(summary.avgInr)}</td><td colSpan={3} /></tr></tfoot>}
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Spend by feature</h2>
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-line bg-paper text-[11px] uppercase tracking-wider text-ink-faint"><tr><th className="px-4 py-2.5">Feature</th><th className="px-4 py-2.5 text-right">Actions</th><th className="px-4 py-2.5 text-right">Spend</th><th className="px-4 py-2.5 text-right">Per action</th></tr></thead>
            <tbody className="divide-y divide-line">
              {byOperation.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-ink-soft">Nothing yet.</td></tr>}
              {byOperation.map((o) => <tr key={o.operation}><td className="px-4 py-3 font-medium">{operationLabel(o.operation)}</td><td className="px-4 py-3 text-right tabular-nums">{o.calls.toLocaleString("en-IN")}</td><td className="px-4 py-3 text-right tabular-nums">{inr(o.costInr)}</td><td className="px-4 py-3 text-right tabular-nums text-ink-soft">{inr(o.avgInr)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-ink-faint">Costs are worked out from the token counts OpenAI returns, at US$ {rates.inputPerM} per million input tokens and US$ {rates.outputPerM} per million output tokens, with US$ 1 = ₹{rates.usdToInr}. Change these in Vercel (AI_COST_INPUT_PER_M_USD, AI_COST_OUTPUT_PER_M_USD, USD_TO_INR) to match your model and exchange rate. Treat the totals as close estimates and compare them with your OpenAI invoice.</p>
    </div>
  );
}

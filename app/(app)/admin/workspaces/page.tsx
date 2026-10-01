import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listAdminWorkspaces } from "@/lib/db/admin";
import { effectivePlan, PLANS } from "@/lib/billing/plans";
import { timeAgo } from "@/lib/time";

export default async function AdminWorkspacesPage({ searchParams }: { searchParams: Promise<{ q?: string; plan?: string }> }) {
  const { q = "", plan = "" } = await searchParams;
  const all = await listAdminWorkspaces();
  const needle = q.trim().toLowerCase();
  const rows = all.filter((w) => (!plan || w.plan === plan) && (!needle || w.name.toLowerCase().includes(needle) || (w.owner_email ?? "").toLowerCase().includes(needle)));
  return (
    <div>
      <form className="mb-5 flex flex-wrap gap-2" role="search">
        <Input name="q" defaultValue={q} placeholder="Search by workspace or owner email" aria-label="Search workspaces" className="max-w-sm" />
        <select name="plan" defaultValue={plan} aria-label="Filter by plan" className="h-9 rounded-lg border border-line-strong bg-surface px-3 text-sm">
          <option value="">All plans</option>{Object.entries(PLANS).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}
        </select>
        <Button type="submit" variant="secondary">Apply</Button>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-line bg-paper text-[11px] uppercase tracking-wider text-ink-faint">
            <tr><th className="px-4 py-2.5">Workspace</th><th className="px-4 py-2.5">Owner</th><th className="px-4 py-2.5">Plan</th><th className="px-4 py-2.5 text-right">Docs this month</th><th className="px-4 py-2.5 text-right">AI this month</th><th className="px-4 py-2.5 text-right">People</th><th className="px-4 py-2.5">Created</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-soft">No workspaces match.</td></tr>}
            {rows.map((w) => {
              const p = effectivePlan({ plan: w.plan, limits: w.limits, status: w.status });
              return (
                <tr key={w.id} className="hover:bg-brand-soft/30">
                  <td className="px-4 py-3 font-semibold"><Link href={`/admin/workspaces/${w.id}`} className="hover:text-brand">{w.name}</Link></td>
                  <td className="px-4 py-3 text-ink-soft">{w.owner_email ?? "-"}</td>
                  <td className="px-4 py-3"><Badge tone={w.plan === "free" ? "neutral" : "brand"}>{p.name}</Badge>{w.status === "suspended" && <Badge tone="signal" className="ml-1">paused</Badge>}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{w.documents_month}<span className="text-ink-faint"> / {p.monthlyDocuments ?? "∞"}</span></td>
                  <td className="px-4 py-3 text-right tabular-nums">{w.ai_month}<span className="text-ink-faint"> / {p.aiPerMonth}</span></td>
                  <td className="px-4 py-3 text-right tabular-nums">{w.members}</td>
                  <td className="px-4 py-3 text-ink-soft">{timeAgo(w.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

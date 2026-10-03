import Link from "next/link";
import { UserPlus } from "lucide-react";
import { QuickPlanSelect } from "@/components/admin/user-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { effectivePlan } from "@/lib/billing/plans";
import { listAdminUsers } from "@/lib/db/admin";
import { getAiCosts } from "@/lib/db/admin-costs";
import { timeAgo } from "@/lib/time";

const PER_PAGE = 25;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q ?? "";
  const [{ users, total }, costs] = await Promise.all([listAdminUsers(page, PER_PAGE, q), getAiCosts("month")]);
  const spend = new Map(costs.byUser.map((c) => [c.userId, c.costInr]));
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (p: number) => `/admin/users?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <form className="flex gap-2" role="search">
          <Input name="q" defaultValue={q} placeholder="Search by name or email" aria-label="Search users" className="w-72 max-w-full" />
          <Button type="submit" variant="secondary">Search</Button>
        </form>
        <Button asChild><Link href="/admin/users/new"><UserPlus className="size-4" aria-hidden />Add user</Link></Button>
      </div>
      <p className="mb-3 text-sm text-ink-soft">{total} account{total === 1 ? "" : "s"}. The first one is the admin.</p>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-line bg-paper text-[11px] uppercase tracking-wider text-ink-faint">
            <tr><th className="px-4 py-2.5">User</th><th className="px-4 py-2.5">Workspace</th><th className="px-4 py-2.5">Plan</th><th className="px-4 py-2.5 text-right">Docs / AI this month</th><th className="px-4 py-2.5 text-right">OpenAI spend this month</th><th className="px-4 py-2.5">Last sign-in</th><th className="px-4 py-2.5"><span className="sr-only">Manage</span></th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-soft">No accounts found.</td></tr>}
            {users.map((u) => {
              const w = u.workspaces.find((x) => x.role === "owner") ?? u.workspaces[0];
              const p = w ? effectivePlan({ plan: w.plan, limits: w.limits, status: w.status }) : null;
              return (
                <tr key={u.id} className="hover:bg-brand-soft/30">
                  <td className="px-4 py-3"><Link href={`/admin/users/${u.id}`} className="font-semibold hover:text-brand">{u.email}</Link>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">{u.fullName || "No name"}{u.isAdmin && <Badge tone="brand">Admin</Badge>}{u.paused && <Badge tone="signal">Paused</Badge>}{!u.confirmed && <Badge tone="warn">Unconfirmed</Badge>}</div></td>
                  <td className="px-4 py-3 text-ink-soft">{w ? <>{w.name}{u.workspaces.length > 1 && <span className="text-ink-faint"> +{u.workspaces.length - 1}</span>}</> : <span className="text-ink-faint">None yet</span>}</td>
                  <td className="px-4 py-3">{w ? <QuickPlanSelect workspaceId={w.id} plan={w.plan} /> : "-"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{w && p ? <>{w.documents_month}<span className="text-ink-faint"> / {p.monthlyDocuments ?? "∞"}</span>, {w.ai_month}<span className="text-ink-faint"> / {p.aiPerMonth}</span></> : "-"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">₹{(spend.get(u.id) ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-ink-soft">{u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : "Never"}</td>
                  <td className="px-4 py-3 text-right"><Link href={`/admin/users/${u.id}`} className="font-semibold text-brand hover:underline">Manage</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={qs(page - 1)} className="font-semibold text-brand hover:underline">Previous</Link> : <span />}
          <span className="text-ink-soft">Page {page} of {pages}</span>
          {page < pages ? <Link href={qs(page + 1)} className="font-semibold text-brand hover:underline">Next</Link> : <span />}
        </div>
      )}
    </div>
  );
}

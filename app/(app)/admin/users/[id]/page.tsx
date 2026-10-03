import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { CreateWorkspaceForm, MemberManager, UserActions } from "@/components/admin/user-controls";
import { SubscriptionForm } from "@/components/admin/subscription-form";
import { Badge } from "@/components/ui/badge";
import { effectivePlan } from "@/lib/billing/plans";
import { getUser } from "@/lib/auth/session";
import { getAdminUser, getAdminWorkspace } from "@/lib/db/admin";
import { getAiCosts } from "@/lib/db/admin-costs";
import { timeAgo } from "@/lib/time";

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const user = await getAdminUser(id);
  if (!user) notFound();
  const me = await getUser();
  const [details, monthCosts, allCosts] = await Promise.all([Promise.all(user.workspaces.map((w) => getAdminWorkspace(w.id))), getAiCosts("month"), getAiCosts("all")]);
  const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const spendMonth = monthCosts.byUser.find((c) => c.userId === id)?.costInr ?? 0, spendAll = allCosts.byUser.find((c) => c.userId === id)?.costInr ?? 0;

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-brand"><ArrowLeft className="size-4" aria-hidden />All users</Link>
      <div>
        <div className="flex flex-wrap items-center gap-2"><h2 className="break-all text-2xl font-extrabold">{user.email}</h2>{user.isAdmin && <Badge tone="brand">Admin</Badge>}{user.paused && <Badge tone="signal">Paused</Badge>}</div>
        <p className="mt-1 text-sm text-ink-soft">{user.fullName || "No name"} · joined {timeAgo(user.created_at)} · last sign-in {user.last_sign_in_at ? timeAgo(user.last_sign_in_at) : "never"} · email {user.confirmed ? "confirmed" : "not confirmed"}</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft"><p className="text-sm text-ink-soft">OpenAI spend this month</p><p className="mt-1 text-2xl font-extrabold tabular-nums">{inr(spendMonth)}</p></div>
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft"><p className="text-sm text-ink-soft">OpenAI spend, all time</p><p className="mt-1 text-2xl font-extrabold tabular-nums">{inr(spendAll)}</p></div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6 shadow-soft">
        <h3 className="mb-3 font-bold">Account</h3>
        <UserActions userId={user.id} email={user.email} paused={user.paused} isSelfOrAdmin={user.isAdmin || me?.id === user.id} />
      </section>

      {user.workspaces.length === 0 && (
        <section className="rounded-2xl border border-line bg-surface p-6 shadow-soft">
          <h3 className="mb-1 font-bold">No workspace yet</h3>
          <p className="mb-4 text-sm text-ink-soft">They will create one when they first sign in. You can also create it now, so you can set their plan and limits before they log in.</p>
          <CreateWorkspaceForm userId={user.id} />
        </section>
      )}

      {user.workspaces.map((w, i) => {
        const d = details[i];
        if (!d) return null;
        const p = effectivePlan({ plan: d.ws.plan, limits: d.ws.limits, status: d.ws.status });
        return (
          <section key={w.id} className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold">{w.name} <span className="text-sm font-normal text-ink-soft">({w.role})</span></h3>
              <Badge tone={w.plan === "free" ? "neutral" : "brand"}>{p.name}</Badge>
            </div>
            <p className="text-sm text-ink-soft">This month: {d.ws.documents_month} of {p.monthlyDocuments ?? "unlimited"} documents, {d.ws.ai_month} of {p.aiPerMonth} AI actions, {d.people.length} of {p.teamMembers ?? "unlimited"} people.</p>
            <SubscriptionForm initial={{ workspaceId: w.id, plan: d.ws.plan, status: d.ws.status, periodEnd: d.periodEnd ? d.periodEnd.slice(0, 10) : "", note: d.ws.note ?? "", limits: d.ws.limits }} />
            <div className="rounded-xl border border-line p-4">
              <h4 className="mb-2 text-sm font-semibold">People in this workspace</h4>
              <MemberManager workspaceId={w.id} people={d.people} />
            </div>
          </section>
        );
      })}
    </div>
  );
}

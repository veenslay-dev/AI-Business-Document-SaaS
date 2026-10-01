"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import {
  adminAddMemberAction, adminCreateUserAction, adminCreateWorkspaceForUserAction, adminDeleteUserAction, adminRemoveMemberAction,
  adminResetPasswordAction, adminSetMemberRoleAction, adminSetPlanAction, adminSetUserPausedAction,
} from "@/lib/actions/admin-users";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import type { ActionResult } from "@/lib/actions/result";

/** Runs a server action, shows its message and refreshes the page. */
function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult<unknown>>, after?: () => void) => start(async () => {
    try { const r = await fn(); if (r.ok) { if (r.message) toast.success(r.message); after?.(); router.refresh(); } else toast.error(r.error); }
    catch { toast.error("We couldn't reach the server. Check your connection and try again."); }
  });
  return { run, pending };
}

const planOptions = (Object.keys(PLANS) as PlanId[]).map((id) => <option key={id} value={id}>{PLANS[id].name}</option>);

/** One-click plan change that keeps any custom limits. */
export function QuickPlanSelect({ workspaceId, plan }: { workspaceId: string; plan: string }) {
  const { run, pending } = useRun();
  return (
    <select aria-label="Plan" value={plan} disabled={pending} onChange={(e) => run(() => adminSetPlanAction(workspaceId, e.target.value))}
      className="h-8 rounded-lg border border-line-strong bg-surface px-2 text-sm font-medium disabled:opacity-50">{planOptions}</select>
  );
}

const randomPassword = () => { const c = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const a = new Uint32Array(14); crypto.getRandomValues(a); return Array.from(a, (n) => c[n % c.length]).join(""); };

export function CreateUserForm() {
  const router = useRouter();
  const [v, setV] = useState({ email: "", fullName: "", companyName: "", password: randomPassword(), plan: "free" as PlanId });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<{ email: string; password: string; userId: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));

  function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setFields({});
    start(async () => {
      try {
        const r = await adminCreateUserAction(v);
        if (r.ok && r.data) setCreated({ email: v.email, password: v.password, userId: r.data.userId });
        else if (!r.ok) { setError(r.error); setFields(r.fieldErrors ?? {}); }
      } catch { setError("We couldn't reach the server."); }
    });
  }

  if (created) {
    return (
      <div className="max-w-xl space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-soft" role="status">
        <h2 className="text-lg font-bold">Account created</h2>
        <p className="text-sm text-ink-soft">Share these sign-in details with them privately. The password is not shown again.</p>
        <dl className="rounded-xl bg-paper p-4 text-sm"><div className="flex justify-between gap-4 py-1"><dt className="text-ink-soft">Email</dt><dd className="font-mono">{created.email}</dd></div><div className="flex justify-between gap-4 py-1"><dt className="text-ink-soft">Password</dt><dd className="font-mono">{created.password}</dd></div></dl>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => { void navigator.clipboard?.writeText(`Email: ${created.email}\nPassword: ${created.password}`); toast.success("Copied."); }} variant="secondary">Copy details</Button>
          <Button onClick={() => router.push(`/admin/users/${created.userId}`)}>Set limits and manage</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-soft" noValidate>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="u-name" error={fields.fullName}><Input id="u-name" value={v.fullName} onChange={(e) => set("fullName", e.target.value)} required /></Field>
        <Field label="Email" htmlFor="u-email" error={fields.email}><Input id="u-email" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} required /></Field>
        <Field label="Company name" htmlFor="u-company" error={fields.companyName} hint="Becomes their workspace."><Input id="u-company" value={v.companyName} onChange={(e) => set("companyName", e.target.value)} required /></Field>
        <Field label="Plan" htmlFor="u-plan" hint="Set custom limits after creating."><Select id="u-plan" value={v.plan} onChange={(e) => set("plan", e.target.value as PlanId)}>{planOptions}</Select></Field>
        <Field label="Starting password" htmlFor="u-pass" error={fields.password} className="sm:col-span-2">
          <div className="flex gap-2"><Input id="u-pass" value={v.password} onChange={(e) => set("password", e.target.value)} className="font-mono" /><Button type="button" variant="secondary" onClick={() => set("password", randomPassword())}>Generate</Button></div>
        </Field>
      </div>
      <p className="text-xs text-ink-faint">The account is created with the email already confirmed, so they can sign in straight away. They can change the password in Settings.</p>
      <Button type="submit" loading={pending}>Create account</Button>
    </form>
  );
}

export function UserActions({ userId, email, paused, isSelfOrAdmin }: { userId: string; email: string; paused: boolean; isSelfOrAdmin: boolean }) {
  const { run, pending } = useRun();
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [open, setOpen] = useState<"" | "password" | "delete">("");
  if (isSelfOrAdmin) return <p className="text-sm text-ink-soft">This is the platform admin account, so it can't be paused or deleted here.</p>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" loading={pending} onClick={() => run(() => adminSetUserPausedAction(userId, !paused))}>{paused ? "Restore account" : "Pause account"}</Button>
        <Button variant="secondary" onClick={() => setOpen(open === "password" ? "" : "password")}>Set new password</Button>
        <Button variant="danger" onClick={() => setOpen(open === "delete" ? "" : "delete")}>Delete account</Button>
      </div>
      {open === "password" && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl bg-paper p-4">
          <Field label="New password" htmlFor="pw" className="min-w-60 flex-1"><Input id="pw" value={pw} onChange={(e) => setPw(e.target.value)} className="font-mono" placeholder="At least 8 characters" /></Field>
          <Button variant="secondary" onClick={() => setPw(randomPassword())}>Generate</Button>
          <Button loading={pending} onClick={() => run(() => adminResetPasswordAction(userId, pw), () => { void navigator.clipboard?.writeText(pw); setOpen(""); toast.message("The new password was copied to your clipboard."); })}>Save password</Button>
        </div>
      )}
      {open === "delete" && (
        <div className="space-y-3 rounded-xl border border-signal/30 bg-signal-soft p-4">
          <p className="text-sm text-[#7d2a16]">This permanently deletes the account. Workspaces where they are the only member are deleted too, with all their clients and documents. This can't be undone.</p>
          <Field label={`Type ${email} to confirm`} htmlFor="del"><Input id="del" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
          <Button variant="danger" loading={pending} disabled={confirm.trim().toLowerCase() !== email.toLowerCase()} onClick={() => run(() => adminDeleteUserAction(userId, confirm), () => router.push("/admin/users"))}>Delete permanently</Button>
        </div>
      )}
    </div>
  );
}

export function CreateWorkspaceForm({ userId }: { userId: string }) {
  const { run, pending } = useRun();
  const [name, setName] = useState(""); const [plan, setPlan] = useState<PlanId>("free");
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field label="Company name" htmlFor="nw-name" className="min-w-52 flex-1"><Input id="nw-name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Plan" htmlFor="nw-plan"><Select id="nw-plan" value={plan} onChange={(e) => setPlan(e.target.value as PlanId)}>{planOptions}</Select></Field>
      <Button loading={pending} onClick={() => run(() => adminCreateWorkspaceForUserAction(userId, name, plan), () => setName(""))}>Create workspace</Button>
    </div>
  );
}

export function MemberManager({ workspaceId, people }: { workspaceId: string; people: { userId: string; email: string; role: string }[] }) {
  const { run, pending } = useRun();
  const [email, setEmail] = useState(""); const [role, setRole] = useState("member");
  return (
    <div>
      <ul className="divide-y divide-line text-sm">
        {people.map((m) => (
          <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="break-all">{m.email}</span>
            <span className="flex items-center gap-2">
              <select aria-label={`Role of ${m.email}`} value={m.role} disabled={pending} onChange={(e) => run(() => adminSetMemberRoleAction(workspaceId, m.userId, e.target.value))} className="h-8 rounded-lg border border-line-strong bg-surface px-2 text-sm">
                <option value="owner">Owner</option><option value="admin">Admin</option><option value="member">Member</option>
              </select>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => { if (confirm(`Remove ${m.email} from this workspace?`)) run(() => adminRemoveMemberAction(workspaceId, m.userId)); }}>Remove</Button>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
        <Field label="Add an existing account" htmlFor={`add-${workspaceId}`} className="min-w-52 flex-1"><Input id={`add-${workspaceId}`} type="email" placeholder="their@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)} className="w-32"><option value="member">Member</option><option value="admin">Admin</option><option value="owner">Owner</option></Select>
        <Button variant="secondary" loading={pending} onClick={() => run(() => adminAddMemberAction(workspaceId, email, role), () => setEmail(""))}>Add</Button>
      </div>
    </div>
  );
}

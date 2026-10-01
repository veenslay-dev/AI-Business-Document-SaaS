"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormMessage } from "@/components/ui/field";
import { inputCls } from "@/components/documents/editor/ui";
import { changeRoleAction, inviteMemberAction, removeMemberAction, revokeInviteAction } from "@/lib/actions/team";
import { initials } from "@/lib/utils";

export type MemberView = { id: string; name: string; email: string; role: "owner" | "admin" | "member"; isYou: boolean };
export type InviteView = { id: string; email: string; role: string; link: string };

export function TeamManager({ members, invites, canManage }: { members: MemberView[]; invites: InviteView[]; canManage: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const copy = (t: string) => { navigator.clipboard.writeText(t).then(() => toast.success("Link copied."), () => toast.error("Couldn't copy. Select the link and copy it manually.")); };

  return (
    <div className="max-w-3xl space-y-8">
      {canManage && (
        <form className="rounded-2xl border border-line bg-surface p-4 shadow-soft" onSubmit={(e) => { e.preventDefault(); setError(null); setLink(null); start(async () => {
          try {
            const res = await inviteMemberAction({ email, role });
            if (res.ok && res.data) { setLink(res.data.link); setEmail(""); router.refresh(); } else if (!res.ok) setError(res.fieldErrors?.email ?? res.error);
          } catch { setError("We couldn't reach the server. Try again."); }
        }); }}>
          <h2 className="mb-3 font-semibold">Invite someone</h2>
          {error && <div className="mb-3"><FormMessage kind="error">{error}</FormMessage></div>}
          <div className="flex flex-wrap gap-2">
            <input type="email" required className={`${inputCls} min-w-56 flex-1`} placeholder="colleague@company.com" aria-label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
            <select className={`${inputCls} w-32`} aria-label="Role" value={role} onChange={(e) => setRole(e.target.value as "admin" | "member")}><option value="member">Member</option><option value="admin">Admin</option></select>
            <Button type="submit" loading={pending}>Send invite</Button>
          </div>
          <p className="mt-2 text-xs text-ink-faint">Members create and edit documents. Admins can also change the brand kit, company details and team. Email delivery isn't connected yet, so share the link yourself.</p>
          {link && <div className="mt-3 flex gap-2"><input readOnly value={link} aria-label="Invite link" className="h-9 min-w-0 flex-1 rounded-md border border-line-strong bg-paper px-3 text-sm" onFocus={(e) => e.currentTarget.select()} /><Button variant="secondary" onClick={() => copy(link)}><Copy className="size-4" aria-hidden />Copy</Button></div>}
        </form>
      )}

      <section>
        <h2 className="mb-3 font-semibold">Members</h2>
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface shadow-soft">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="grid size-8 place-items-center rounded-full bg-black/[0.07] text-xs font-semibold">{initials(m.name)}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{m.name}{m.isYou && <span className="text-ink-faint"> (you)</span>}</p><p className="truncate text-xs text-ink-soft">{m.email}</p></div>
              {canManage && m.role !== "owner" ? (
                <>
                  <select aria-label={`Role for ${m.name}`} className="h-8 rounded-md border border-line-strong bg-surface px-2 text-sm" value={m.role} onChange={(e) => { void changeRoleAction(m.id, e.target.value as "admin" | "member").then((r) => { if (r.ok) { toast.success(r.message ?? "Saved."); router.refresh(); } else toast.error(r.error); }); }}><option value="member">Member</option><option value="admin">Admin</option></select>
                  <ConfirmButton size="sm" variant="ghost" className="text-signal hover:text-signal" title={`Remove ${m.name}?`} description="They lose access to this workspace right away. Documents they created stay." action={() => removeMemberAction(m.id)} onDone={() => router.refresh()}>Remove</ConfirmButton>
                </>
              ) : <Badge tone={m.role === "owner" ? "brand" : "neutral"}>{m.role[0].toUpperCase() + m.role.slice(1)}</Badge>}
            </li>
          ))}
        </ul>
      </section>

      {canManage && invites.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Pending invites</h2>
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface shadow-soft">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{i.email} <span className="text-ink-faint">({i.role})</span></span>
                <Button size="sm" variant="secondary" onClick={() => copy(i.link)}><Copy className="size-3.5" aria-hidden />Copy link</Button>
                <ConfirmButton size="sm" variant="ghost" title="Revoke this invite?" description="The link will stop working." confirmLabel="Revoke" action={() => revokeInviteAction(i.id)} onDone={() => router.refresh()}>Revoke</ConfirmButton>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

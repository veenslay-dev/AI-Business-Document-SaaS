"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { inputCls, Labeled } from "@/components/documents/editor/ui";
import { createSocialAuditAction } from "@/lib/actions/social-audits";
import { GENERAL_SECTIONS, PLATFORMS, type PlatformKey } from "@/lib/social/library";

export function SocialAuditForm({ clients, presetClient, templates }: {
  clients: { id: string; name: string }[]; presetClient: string; templates: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(clients.some((c) => c.id === presetClient) ? presetClient : "");
  const [accounts, setAccounts] = useState<Record<string, string>>({}); // platform -> handle or link (present means selected)
  const [general, setGeneral] = useState<string[]>(GENERAL_SECTIONS.filter((s) => s.key !== "paid-social").map((s) => s.key));
  const [template, setTemplate] = useState(templates[0]?.value ?? "sys:social-audit-scorecard");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (clients.length === 0) return <p className="text-sm text-ink-soft">You don't have any clients yet. <Link href="/clients/new" className="font-medium text-brand hover:underline">Add one first</Link>, then start an audit.</p>;

  const toggleGeneral = (k: string) => setGeneral((g) => (g.includes(k) ? g.filter((x) => x !== k) : [...g, k]));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!clientId) return setError("Choose a client.");
    const platforms = Object.keys(accounts) as PlatformKey[];
    if (platforms.length === 0) return setError("Select at least one platform to audit. You can add more sections later in the editor.");
    start(async () => {
      try {
        const [kind, key] = template.split(":");
        const res = await createSocialAuditAction({
          clientId, templateKey: kind === "sys" ? key : "social-audit-scorecard",
          accounts: platforms.map((p) => ({ platform: p, handle: accounts[p], url: accounts[p] })),
          sectionKeys: [...general, ...platforms],
        });
        if (res.ok && res.data) { toast.success("Audit created. Fill in the checklists."); router.push(res.data.href); }
        else if (!res.ok) setError(res.error);
      } catch { setError("We couldn't reach the server. Check your connection and try again."); }
    });
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-7">
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <Labeled label="Client"><select className={inputCls} value={clientId} onChange={(e) => setClientId(e.target.value)}><option value="">Choose a client</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Labeled>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Accounts to audit</legend>
        <p className="mb-3 text-xs text-ink-faint">Each platform you tick adds its own checklist section.</p>
        <div className="space-y-2">
          {PLATFORMS.map((p) => {
            const on = p.key in accounts;
            return (
              <div key={p.key} className="flex flex-wrap items-center gap-3">
                <label className="flex w-36 items-center gap-2 text-sm"><input type="checkbox" checked={on} onChange={(e) => setAccounts((a) => { const n = { ...a }; if (e.target.checked) n[p.key] = ""; else delete n[p.key]; return n; })} />{p.label}</label>
                {on && <input className={`${inputCls} min-w-56 flex-1`} aria-label={`${p.label} handle or link`} placeholder="@handle or profile link" value={accounts[p.key]} onChange={(e) => setAccounts((a) => ({ ...a, [p.key]: e.target.value }))} />}
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Checklist sections to include</legend>
        <p className="mb-3 text-xs text-ink-faint">You can add, remove or write your own sections after creating the audit.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {GENERAL_SECTIONS.map((s) => (
            <label key={s.key} className="flex items-start gap-2 rounded-md border border-line bg-surface p-2.5 text-sm shadow-soft">
              <input type="checkbox" className="mt-1" checked={general.includes(s.key)} onChange={() => toggleGeneral(s.key)} />
              <span><span className="block font-medium">{s.title}</span><span className="text-xs text-ink-soft">{s.items.length} checkpoints</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      <Labeled label="Report template" className="max-w-xs"><select className={inputCls} value={template} onChange={(e) => setTemplate(e.target.value)}>{templates.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Labeled>
      <Button type="submit" loading={pending}>Create audit</Button>
    </form>
  );
}

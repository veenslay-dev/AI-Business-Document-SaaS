"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveNotificationPrefsAction } from "@/lib/actions/workspace";

type Prefs = { document_viewed: boolean; document_accepted: boolean; changes_requested: boolean };
const ROWS: { key: keyof Prefs; label: string; hint: string }[] = [
  { key: "document_viewed", label: "A client opens a document", hint: "Shown in the bell menu when someone views a shared link." },
  { key: "document_accepted", label: "A client accepts or rejects", hint: "Acceptances and rejections of proposals and quotations." },
  { key: "changes_requested", label: "A client requests changes", hint: "Comments left through the Request changes button." },
];

export function NotificationForm({ initial }: { initial: Prefs }) {
  const [p, setP] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <form className="max-w-lg space-y-4" onSubmit={(e) => { e.preventDefault(); start(async () => {
      const res = await saveNotificationPrefsAction(p);
      if (res.ok) toast.success(res.message ?? "Saved."); else toast.error(res.error);
    }); }}>
      {ROWS.map((r) => (
        <label key={r.key} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-3 shadow-soft">
          <input type="checkbox" className="mt-1" checked={p[r.key]} onChange={(e) => setP({ ...p, [r.key]: e.target.checked })} />
          <span><span className="block text-sm font-medium">{r.label}</span><span className="text-xs text-ink-soft">{r.hint}</span></span>
        </label>
      ))}
      <p className="text-xs text-ink-faint">Email notifications will use these same choices once an email provider is connected.</p>
      <Button type="submit" loading={pending}>Save</Button>
    </form>
  );
}

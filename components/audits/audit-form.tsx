"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { inputCls, Labeled } from "@/components/documents/editor/ui";
import { createAuditAction } from "@/lib/actions/audits";

export function AuditForm({ clients, presetClient, aiConfigured, templates }: {
  clients: { id: string; name: string }[]; presetClient: string; aiConfigured: boolean; templates: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState(clients.some((c) => c.id === presetClient) ? presetClient : "");
  const [url, setUrl] = useState("");
  const [useAi, setUseAi] = useState(aiConfigured);
  const [template, setTemplate] = useState(templates[0]?.value ?? "sys:audit-seo-professional");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (clients.length === 0) return <p className="text-sm text-ink-soft">You don't have any clients yet. <Link href="/clients/new" className="font-medium text-brand hover:underline">Add one first</Link>, then run an audit.</p>;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!clientId) return setError("Choose a client.");
    start(async () => {
      try {
        const [kind, key] = template.split(":");
        const res = await createAuditAction({ clientId, url, useAi, templateKey: kind === "sys" ? key : "audit-seo-professional" });
        if (res.ok && res.data) { if (res.data.notice) toast.message(res.data.notice); else toast.success("Audit ready."); router.push(res.data.href); }
        else if (!res.ok) setError(res.error);
      } catch { setError("The audit took too long or the connection dropped. Try again."); }
    });
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-5">
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <Labeled label="Client"><select className={inputCls} value={clientId} onChange={(e) => setClientId(e.target.value)}><option value="">Choose a client</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Labeled>
      <Labeled label="Website address"><input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://novafurniture.example" inputMode="url" required /></Labeled>
      <Labeled label="Report template"><select className={inputCls} value={template} onChange={(e) => setTemplate(e.target.value)}>{templates.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Labeled>
      <label className={`flex items-start gap-2 text-sm ${aiConfigured ? "" : "opacity-60"}`}>
        <input type="checkbox" className="mt-1" checked={useAi} disabled={!aiConfigured} onChange={(e) => setUseAi(e.target.checked)} />
        <span>Explain findings in plain language with AI<span className="block text-xs text-ink-faint">{aiConfigured ? "Turns technical findings into client-friendly explanations. The raw findings are kept if it fails." : "AI isn't configured for this deployment. Findings use built-in explanations."}</span></span>
      </label>
      <Button type="submit" loading={pending}>{pending ? "Scanning the site" : "Run audit"}</Button>
      {pending && <p className="flex items-center gap-2 text-sm text-ink-soft" role="status"><Loader2 className="size-4 animate-spin" aria-hidden />Checking the home page, a few inner pages, robots.txt, the sitemap and speed. This takes 20 to 60 seconds.</p>}
      <p className="text-xs text-ink-faint">The scan reads public pages only, about 20 requests in total, and identifies itself as PrioDraftAuditBot.</p>
    </form>
  );
}

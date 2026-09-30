"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { inputCls, Labeled } from "@/components/documents/editor/ui";
import { deletePackageAction, savePackageAction } from "@/lib/actions/config";
import { CURRENCIES } from "@/lib/documents/content";
import { formatMoney } from "@/lib/documents/quotation";

export type PackageView = { id: string | null; tier: "basic" | "standard" | "premium" | "custom"; name: string; description: string; price: number; currency: string; features: string[] };
const TIERS = ["basic", "standard", "premium", "custom"] as const;

function PackageCard({ initial, canEdit, onDone }: { initial: PackageView; canEdit: boolean; onDone: () => void }) {
  const [p, setP] = useState(initial);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<Record<string, string>>({});
  const dirty = JSON.stringify(p) !== JSON.stringify(initial) || !initial.id;

  function save() {
    setErr({});
    start(async () => {
      try {
        const res = await savePackageAction(p.id, { tier: p.tier, name: p.name, description: p.description, price: p.price, currency: p.currency as "INR", features: p.features.filter((f) => f.trim()) });
        if (res.ok) { toast.success(res.message ?? "Saved."); onDone(); } else { setErr(res.fieldErrors ?? {}); toast.error(res.error); }
      } catch { toast.error("We couldn't reach the server. Try again."); }
    });
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-soft">
      <fieldset disabled={!canEdit} className="space-y-3">
        <div className="flex gap-2">
          <Labeled label="Name" className="flex-1"><input className={inputCls} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} aria-invalid={!!err.name} placeholder="Growth" />{err.name && <span className="text-xs text-signal">{err.name}</span>}</Labeled>
          <Labeled label="Tier" className="w-32"><select className={inputCls} value={p.tier} onChange={(e) => setP({ ...p, tier: e.target.value as PackageView["tier"] })}>{TIERS.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}</select></Labeled>
        </div>
        <div className="grid grid-cols-[1fr_90px] gap-2">
          <Labeled label="Price"><input type="number" min={0} className={inputCls} value={p.price} onChange={(e) => setP({ ...p, price: Number(e.target.value) || 0 })} /></Labeled>
          <Labeled label="Currency"><select className={inputCls} value={p.currency} onChange={(e) => setP({ ...p, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Labeled>
        </div>
        <Labeled label="Short description"><input className={inputCls} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></Labeled>
        <Labeled label="Features (one per line)"><textarea className={`${inputCls} min-h-24`} value={p.features.join("\n")} onChange={(e) => setP({ ...p, features: e.target.value.split("\n") })} /></Labeled>
      </fieldset>
      {canEdit && (
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" loading={pending} disabled={!dirty} onClick={save}>{p.id ? "Save" : "Add package"}</Button>
          {p.id && <ConfirmButton size="sm" variant="ghost" className="text-signal hover:text-signal" title="Delete this package?" description="Proposals that already include it keep their copy." action={() => deletePackageAction(p.id!)} onDone={onDone}>Delete</ConfirmButton>}
          <span className="ml-auto text-sm text-ink-soft">{formatMoney(p.price, p.currency)}</span>
        </div>
      )}
    </div>
  );
}

export function PackageManager({ packages, canEdit }: { packages: PackageView[]; canEdit: boolean }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const done = () => { setAdding(false); router.refresh(); };
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {packages.map((p) => <PackageCard key={p.id} initial={p} canEdit={canEdit} onDone={done} />)}
        {adding && <PackageCard initial={{ id: null, tier: packages.some((p) => p.tier === "basic") ? (packages.some((p) => p.tier === "standard") ? "premium" : "standard") : "basic", name: "", description: "", price: 0, currency: "INR", features: [] }} canEdit onDone={done} />}
      </div>
      {canEdit && !adding && <Button variant="secondary" onClick={() => setAdding(true)}><Plus className="size-4" aria-hidden />Add package</Button>}
    </div>
  );
}

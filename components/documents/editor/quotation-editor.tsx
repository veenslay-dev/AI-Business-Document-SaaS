"use client";

import { useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { IconButton, Labeled, MoveControls, inputCls, move } from "./ui";
import { newId, CURRENCIES, type Block, type QuotationItem } from "@/lib/documents/content";
import { calculateQuotation, formatMinor } from "@/lib/documents/quotation";
import { generateQuotationDescriptionAction } from "@/lib/actions/ai";

type Q = Extract<Block, { type: "quotation" }>;
type Item = Extract<QuotationItem, { kind: "item" }>;

const num = (v: string) => (v === "" ? 0 : Number(v) || 0);

export function QuotationEditor({ block, onChange, disabled }: { block: Q; onChange: (b: Q) => void; disabled: boolean }) {
  const d = block.data;
  const totals = calculateQuotation(d);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const setData = (fn: (x: Q["data"]) => void) => { const c = structuredClone(block); fn(c.data); onChange(c); };

  async function describe(i: number) {
    const it = d.items[i] as Item;
    setAiBusy(it.id);
    try {
      const res = await generateQuotationDescriptionAction({ service: it.name });
      if (res.ok && res.data) setData((x) => { (x.items[i] as Item).description = res.data!.description; });
      else if (!res.ok) toast.error(res.error);
    } catch { toast.error("We couldn't reach the server. Check your connection and try again."); }
    setAiBusy(null);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Labeled label={d.dueLabel === "Due date" ? "Invoice no." : "Quotation no."}><input className={inputCls} value={d.number} disabled={disabled} onChange={(e) => setData((x) => { x.number = e.target.value; })} /></Labeled>
        <Labeled label="Issue date"><input type="date" className={inputCls} value={d.issueDate} disabled={disabled} onChange={(e) => setData((x) => { x.issueDate = e.target.value; })} /></Labeled>
        <Labeled label={d.dueLabel || "Valid until"}><input type="date" className={inputCls} value={d.validUntil} disabled={disabled} onChange={(e) => setData((x) => { x.validUntil = e.target.value; })} /></Labeled>
        <Labeled label="Currency"><select className={inputCls} value={d.currency} disabled={disabled} onChange={(e) => setData((x) => { x.currency = e.target.value as typeof x.currency; })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Labeled>
        <Labeled label="Tax name"><input className={inputCls} value={d.taxLabel} disabled={disabled} onChange={(e) => setData((x) => { x.taxLabel = e.target.value; })} /></Labeled>
        <Labeled label="Default tax %"><input type="number" min={0} max={100} step="0.01" className={inputCls} value={d.taxRate} disabled={disabled} onChange={(e) => setData((x) => { x.taxRate = Math.min(100, num(e.target.value)); })} /></Labeled>
        <Labeled label="Prices include tax"><select className={inputCls} value={d.taxInclusive ? "yes" : "no"} disabled={disabled} onChange={(e) => setData((x) => { x.taxInclusive = e.target.value === "yes"; })}><option value="no">No, add tax</option><option value="yes">Yes, included</option></select></Labeled>
        <Labeled label="Overall discount">
          <div className="flex gap-1"><input type="number" min={0} className={inputCls} value={d.discount} disabled={disabled} aria-label="Overall discount amount" onChange={(e) => setData((x) => { x.discount = num(e.target.value); })} />
            <select className={`${inputCls} w-16`} value={d.discountType} disabled={disabled} aria-label="Overall discount type" onChange={(e) => setData((x) => { x.discountType = e.target.value as "percent" | "fixed"; })}><option value="percent">%</option><option value="fixed">{d.currency}</option></select></div>
        </Labeled>
      </div>

      <div className="space-y-2">
        {d.items.length === 0 && <p className="rounded-md border border-dashed border-line-strong px-3 py-4 text-center text-sm text-ink-soft">No items yet. Add an item to start.</p>}
        {d.items.map((it, i) => it.kind === "section" ? (
          <div key={it.id} className="flex items-center gap-2 rounded-md bg-brand/5 px-2 py-1.5">
            <input className={`${inputCls} font-semibold`} value={it.title} placeholder="Section title" aria-label="Section title" disabled={disabled} onChange={(e) => setData((x) => { (x.items[i] as { title: string }).title = e.target.value; })} />
            <MoveControls index={i} count={d.items.length} label="section" onMove={(to) => setData((x) => move(x.items, i, to))} onRemove={() => setData((x) => { x.items.splice(i, 1); })} />
          </div>
        ) : (
          <div key={it.id} className="rounded-md border border-line p-2.5">
            <div className="flex items-start gap-2">
              <div className="grid flex-1 gap-2">
                <input className={inputCls} value={it.name} placeholder="Service or product" aria-label="Item name" disabled={disabled} onChange={(e) => setData((x) => { (x.items[i] as Item).name = e.target.value; })} />
                <div className="flex gap-2">
                  <input className={inputCls} value={it.description} placeholder="Description" aria-label="Item description" disabled={disabled} onChange={(e) => setData((x) => { (x.items[i] as Item).description = e.target.value; })} />
                  <button type="button" disabled={disabled || !it.name.trim() || aiBusy === it.id} onClick={() => describe(i)} title="Write a description with AI" aria-label="Write a description with AI"
                    className="grid size-8 shrink-0 place-items-center rounded-md border border-line-strong text-brand hover:bg-brand/10 disabled:opacity-40"><Sparkles className="size-3.5" /></button>
                </div>
              </div>
              <MoveControls index={i} count={d.items.length} label="item" onMove={(to) => setData((x) => move(x.items, i, to))} onRemove={() => setData((x) => { x.items.splice(i, 1); })} />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
              <Labeled label="Qty"><input type="number" min={0} step="any" className={inputCls} value={it.quantity} disabled={disabled} onChange={(e) => setData((x) => { (x.items[i] as Item).quantity = num(e.target.value); })} /></Labeled>
              <Labeled label="Unit"><input className={inputCls} value={it.unit} placeholder="hrs" disabled={disabled} onChange={(e) => setData((x) => { (x.items[i] as Item).unit = e.target.value; })} /></Labeled>
              <Labeled label="Unit price"><input type="number" min={0} step="any" className={inputCls} value={it.unitPrice} disabled={disabled} onChange={(e) => setData((x) => { (x.items[i] as Item).unitPrice = num(e.target.value); })} /></Labeled>
              <Labeled label="Discount"><div className="flex gap-1"><input type="number" min={0} className={inputCls} value={it.discount} disabled={disabled} aria-label="Discount" onChange={(e) => setData((x) => { (x.items[i] as Item).discount = num(e.target.value); })} />
                <select className={`${inputCls} w-14 px-1`} value={it.discountType} disabled={disabled} aria-label="Discount type" onChange={(e) => setData((x) => { (x.items[i] as Item).discountType = e.target.value as "percent" | "fixed"; })}><option value="percent">%</option><option value="fixed">{d.currency}</option></select></div></Labeled>
              <Labeled label={`${d.taxLabel} %`}><input type="number" min={0} max={100} step="0.01" className={inputCls} value={it.taxRate ?? ""} placeholder={String(d.taxRate)} disabled={disabled} onChange={(e) => setData((x) => { (x.items[i] as Item).taxRate = e.target.value === "" ? null : Math.min(100, num(e.target.value)); })} /></Labeled>
              <div className="text-right"><span className="text-xs font-medium text-ink-soft">Line total</span><p className="pt-1.5 text-sm font-semibold tabular-nums">{formatMinor(totals.lines[it.id]?.total ?? 0, d.currency)}</p></div>
            </div>
          </div>
        ))}
        <div className="flex gap-3 text-sm">
          <button type="button" disabled={disabled} className="inline-flex items-center gap-1 text-brand hover:underline disabled:opacity-40"
            onClick={() => setData((x) => { x.items.push({ kind: "item", id: newId("i"), name: "", description: "", quantity: 1, unit: "", unitPrice: 0, discountType: "percent", discount: 0, taxRate: null }); })}><Plus className="size-3.5" aria-hidden />Add item</button>
          <button type="button" disabled={disabled} className="inline-flex items-center gap-1 text-brand hover:underline disabled:opacity-40"
            onClick={() => setData((x) => { x.items.push({ kind: "section", id: newId("g"), title: "New section" }); })}><Plus className="size-3.5" aria-hidden />Add section</button>
        </div>
      </div>

      <dl className="ml-auto w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd className="tabular-nums">{formatMinor(totals.subtotal, d.currency)}</dd></div>
        {totals.discount > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Discount</dt><dd className="tabular-nums">- {formatMinor(totals.discount, d.currency)}</dd></div>}
        {totals.taxBuckets.map((b) => <div key={b.rate} className="flex justify-between"><dt className="text-ink-soft">{b.label} {b.rate}%</dt><dd className="tabular-nums">{formatMinor(b.tax, d.currency)}</dd></div>)}
        <div className="flex justify-between border-t border-line pt-1.5 font-semibold"><dt>Grand total</dt><dd className="tabular-nums">{formatMinor(totals.grandTotal, d.currency)}</dd></div>
      </dl>
    </div>
  );
}

export { IconButton, Trash2 };

"use client";

import { useRef, useState } from "react";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AiMenu } from "./ai-menu";
import { IconButton, Labeled, inputCls, move } from "./ui";
import { newId, CURRENCIES, type Block } from "@/lib/documents/content";
import { uploadBrandAssetAction } from "@/lib/actions/workspace";
import type { AssistCommand } from "@/lib/ai/schemas";

export type BlockCtx = { documentTitle: string; packages: { id: string; name: string; price: number; description: string; features: string[] }[]; disabled: boolean };
type Props<T extends Block> = { block: T; onChange: (b: T) => void; ctx: BlockCtx };

const lines = (s: string) => s.split(/\r?\n/).map((l) => l.replace(/^[-*•]\s*/, "").trim()).filter(Boolean);

function undoToast(message: string, restore: () => void) {
  toast.success(message, { action: { label: "Undo", onClick: restore }, duration: 8000 });
}

export function TextBlockEditor({ block, onChange, ctx }: Props<Extract<Block, { type: "paragraph" | "callout" }>>) {
  return (
    <div>
      <div className="mb-1 flex justify-end"><AiMenu text={block.content} documentTitle={ctx.documentTitle} mode="all"
        onResult={(_, result) => { const prev = block.content; onChange({ ...block, content: result }); undoToast("Text updated.", () => onChange({ ...block, content: prev })); }} /></div>
      <textarea className={`${inputCls} min-h-24 leading-relaxed`} value={block.content} disabled={ctx.disabled}
        placeholder={block.type === "callout" ? "Highlighted note" : "Write here. Leave a blank line between paragraphs."} onChange={(e) => onChange({ ...block, content: e.target.value })} />
    </div>
  );
}

export function HeadingEditor({ block, onChange, ctx }: Props<Extract<Block, { type: "heading" }>>) {
  return (
    <div className="flex gap-2">
      <select aria-label="Heading level" className={`${inputCls} w-24`} value={block.level} disabled={ctx.disabled} onChange={(e) => onChange({ ...block, level: Number(e.target.value) as 2 | 3 })}>
        <option value={2}>Large</option><option value={3}>Small</option></select>
      <input className={inputCls} value={block.content} disabled={ctx.disabled} onChange={(e) => onChange({ ...block, content: e.target.value })} aria-label="Heading text" />
    </div>
  );
}

export function ListEditor({ block, onChange, ctx }: Props<Extract<Block, { type: "list" }>>) {
  const text = block.items.join("\n");
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <select aria-label="List style" className="rounded border border-line-strong bg-surface px-1.5 py-1 text-xs" value={block.style} disabled={ctx.disabled} onChange={(e) => onChange({ ...block, style: e.target.value as "bullet" | "number" })}>
          <option value="bullet">Bullets</option><option value="number">Numbered</option></select>
        <AiMenu text={text} documentTitle={ctx.documentTitle} mode="all"
          onResult={(_, result) => { const prev = block.items; onChange({ ...block, items: lines(result) }); undoToast("List updated.", () => onChange({ ...block, items: prev })); }} />
      </div>
      <textarea className={`${inputCls} min-h-24`} value={text} disabled={ctx.disabled} placeholder="One item per line"
        onChange={(e) => onChange({ ...block, items: e.target.value.split("\n") })} />
    </div>
  );
}

export function TableEditor({ block, onChange, ctx }: Props<Extract<Block, { type: "table" }>>) {
  const set = (fn: (b: typeof block) => void) => { const b = structuredClone(block); fn(b); onChange(b); };
  return (
    <div className="space-y-2 overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead><tr>{block.headers.map((h, ci) => (
          <th key={ci} className="p-0.5"><input className={`${inputCls} font-semibold`} value={h} aria-label={`Column ${ci + 1} heading`} disabled={ctx.disabled} onChange={(e) => set((b) => { b.headers[ci] = e.target.value; })} /></th>))}
          <th className="w-8" /></tr></thead>
        <tbody>{block.rows.map((r, ri) => (
          <tr key={ri}>{block.headers.map((_, ci) => (
            <td key={ci} className="p-0.5"><input className={inputCls} value={r[ci] ?? ""} aria-label={`Row ${ri + 1}, column ${ci + 1}`} disabled={ctx.disabled}
              onChange={(e) => set((b) => { b.rows[ri] = [...b.headers.map((_, i) => b.rows[ri][i] ?? "")]; b.rows[ri][ci] = e.target.value; })} /></td>))}
            <td><IconButton label={`Remove row ${ri + 1}`} danger disabled={ctx.disabled} onClick={() => set((b) => { b.rows.splice(ri, 1); })}><Trash2 className="size-3.5" /></IconButton></td></tr>))}</tbody>
      </table>
      <div className="flex gap-2 text-xs">
        <button type="button" className="text-brand hover:underline disabled:opacity-40" disabled={ctx.disabled} onClick={() => set((b) => { b.rows.push(b.headers.map(() => "")); })}>+ Row</button>
        <button type="button" className="text-brand hover:underline disabled:opacity-40" disabled={ctx.disabled || block.headers.length >= 8} onClick={() => set((b) => { b.headers.push(`Column ${b.headers.length + 1}`); b.rows.forEach((r) => r.push("")); })}>+ Column</button>
        <button type="button" className="text-signal hover:underline disabled:opacity-40" disabled={ctx.disabled || block.headers.length <= 1} onClick={() => set((b) => { b.headers.pop(); b.rows.forEach((r) => r.pop()); })}>- Column</button>
      </div>
    </div>
  );
}

export function ImageEditor({ block, onChange, ctx }: Props<Extract<Block, { type: "image" }>>) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function upload(f: File) {
    setBusy(true);
    try {
      const fd = new FormData(); fd.set("kind", "doc_image"); fd.set("file", f);
      const res = await uploadBrandAssetAction(fd);
      if (res.ok && res.data) onChange({ ...block, url: res.data.url }); else if (!res.ok) toast.error(res.error);
    } catch { toast.error("The upload failed. Check your connection and try again."); }
    setBusy(false);
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input className={inputCls} value={block.url} placeholder="https://… image address" aria-label="Image URL" disabled={ctx.disabled} onChange={(e) => onChange({ ...block, url: e.target.value })} />
        <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="Upload image" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
        <button type="button" disabled={busy || ctx.disabled} onClick={() => file.current?.click()} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line-strong bg-surface px-2.5 text-sm hover:bg-paper disabled:opacity-50"><ImagePlus className="size-4" aria-hidden />{busy ? "Uploading" : "Upload"}</button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Labeled label="Alt text"><input className={inputCls} value={block.alt} disabled={ctx.disabled} onChange={(e) => onChange({ ...block, alt: e.target.value })} /></Labeled>
        <Labeled label="Caption"><input className={inputCls} value={block.caption} disabled={ctx.disabled} onChange={(e) => onChange({ ...block, caption: e.target.value })} /></Labeled>
      </div>
    </div>
  );
}

export function PricingEditor({ block, onChange, ctx }: Props<Extract<Block, { type: "pricing" }>>) {
  const set = (fn: (b: typeof block) => void) => { const b = structuredClone(block); fn(b); onChange(b); };
  const unused = ctx.packages.filter((p) => !block.packages.some((x) => x.name === p.name && x.price === p.price));
  return (
    <div className="space-y-4">
      <Labeled label="Currency" className="w-32"><select className={inputCls} value={block.currency} disabled={ctx.disabled} onChange={(e) => set((b) => { b.currency = e.target.value as typeof b.currency; })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Labeled>

      <div>
        <p className="mb-1 text-xs font-medium text-ink-soft">Packages (the client sees the one you mark as selected)</p>
        {block.packages.map((p, i) => (
          <div key={p.id} className="mb-2 rounded-md border border-line p-2.5">
            <div className="flex items-center gap-2">
              <input className={inputCls} value={p.name} aria-label="Package name" disabled={ctx.disabled} onChange={(e) => set((b) => { b.packages[i].name = e.target.value; })} />
              <input className={`${inputCls} w-32`} type="number" min={0} value={p.price} aria-label="Package price" disabled={ctx.disabled} onChange={(e) => set((b) => { b.packages[i].price = Number(e.target.value) || 0; })} />
              <IconButton label="Remove package" danger disabled={ctx.disabled} onClick={() => set((b) => { b.packages.splice(i, 1); })}><Trash2 className="size-3.5" /></IconButton>
            </div>
            <textarea className={`${inputCls} mt-2`} rows={3} value={p.features.join("\n")} placeholder="Features, one per line" aria-label="Package features" disabled={ctx.disabled}
              onChange={(e) => set((b) => { b.packages[i].features = e.target.value.split("\n"); })} />
            <label className="mt-2 flex items-center gap-2 text-sm"><input type="radio" name={`sel-${block.id}`} checked={p.selected} disabled={ctx.disabled}
              onChange={() => set((b) => { b.packages.forEach((x, j) => { x.selected = j === i; }); })} />Selected for this proposal</label>
          </div>))}
        <div className="flex flex-wrap gap-2 text-xs">
          <button type="button" disabled={ctx.disabled || block.packages.length >= 4} className="text-brand hover:underline disabled:opacity-40"
            onClick={() => set((b) => { b.packages.push({ id: newId(), name: "New package", price: 0, description: "", features: [], selected: false }); })}>+ New package</button>
          {unused.slice(0, 6).map((p) => (
            <button key={p.id} type="button" disabled={ctx.disabled || block.packages.length >= 4} className="text-brand hover:underline disabled:opacity-40"
              onClick={() => set((b) => { b.packages.push({ id: newId(), name: p.name, price: p.price, description: p.description, features: p.features, selected: false }); })}>+ {p.name}</button>))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-ink-soft">Line items</p>
        {block.rows.map((r, i) => (
          <div key={r.id} className="mb-2 grid grid-cols-[1fr_120px_auto] items-start gap-2">
            <div><input className={inputCls} value={r.name} placeholder="Item" aria-label="Item name" disabled={ctx.disabled} onChange={(e) => set((b) => { b.rows[i].name = e.target.value; })} />
              <input className={`${inputCls} mt-1`} value={r.description} placeholder="Description (optional)" aria-label="Item description" disabled={ctx.disabled} onChange={(e) => set((b) => { b.rows[i].description = e.target.value; })} /></div>
            <input className={inputCls} type="number" min={0} value={r.amount} aria-label="Amount" disabled={ctx.disabled} onChange={(e) => set((b) => { b.rows[i].amount = Number(e.target.value) || 0; })} />
            <IconButton label="Remove item" danger disabled={ctx.disabled} onClick={() => set((b) => { b.rows.splice(i, 1); })}><Trash2 className="size-3.5" /></IconButton>
          </div>))}
        <button type="button" disabled={ctx.disabled} className="text-xs text-brand hover:underline disabled:opacity-40" onClick={() => set((b) => { b.rows.push({ id: newId(), name: "", description: "", amount: 0 }); })}>+ Add item</button>
      </div>
      <Labeled label="Note under the total"><input className={inputCls} value={block.note} disabled={ctx.disabled} onChange={(e) => onChange({ ...block, note: e.target.value })} /></Labeled>
    </div>
  );
}

export function TimelineEditor({ block, onChange, ctx }: Props<Extract<Block, { type: "timeline" }>>) {
  const set = (fn: (b: typeof block) => void) => { const b = structuredClone(block); fn(b); onChange(b); };
  return (
    <div className="space-y-2">
      {block.items.map((it, i) => (
        <div key={it.id} className="rounded-md border border-line p-2.5">
          <div className="flex gap-2">
            <input className={inputCls} value={it.phase} placeholder="Phase" aria-label="Phase" disabled={ctx.disabled} onChange={(e) => set((b) => { b.items[i].phase = e.target.value; })} />
            <input className={`${inputCls} w-36`} value={it.duration} placeholder="Duration" aria-label="Duration" disabled={ctx.disabled} onChange={(e) => set((b) => { b.items[i].duration = e.target.value; })} />
            <IconButton label="Remove phase" danger disabled={ctx.disabled} onClick={() => set((b) => { b.items.splice(i, 1); })}><Trash2 className="size-3.5" /></IconButton>
          </div>
          <textarea className={`${inputCls} mt-2`} rows={2} value={it.description} placeholder="What happens in this phase" aria-label="Phase description" disabled={ctx.disabled} onChange={(e) => set((b) => { b.items[i].description = e.target.value; })} />
          <div className="mt-1 flex gap-1"><button type="button" className="text-xs text-ink-soft hover:underline disabled:opacity-40" disabled={ctx.disabled || i === 0} onClick={() => set((b) => move(b.items, i, i - 1))}>Move up</button>
            <button type="button" className="text-xs text-ink-soft hover:underline disabled:opacity-40" disabled={ctx.disabled || i === block.items.length - 1} onClick={() => set((b) => move(b.items, i, i + 1))}>Move down</button></div>
        </div>))}
      <button type="button" disabled={ctx.disabled} className="inline-flex items-center gap-1 text-xs text-brand hover:underline disabled:opacity-40" onClick={() => set((b) => { b.items.push({ id: newId(), phase: "", duration: "", description: "" }); })}><Plus className="size-3" aria-hidden />Add phase</button>
    </div>
  );
}

export function SimpleBlockEditor({ block, onChange, ctx }: Props<Extract<Block, { type: "signature" | "page_break" | "audit_summary" }>>) {
  if (block.type === "signature") return <Labeled label="Signature label"><input className={inputCls} value={block.label} disabled={ctx.disabled} onChange={(e) => onChange({ ...block, label: e.target.value })} /></Labeled>;
  if (block.type === "page_break") return <p className="text-sm text-ink-soft">A new page starts here in the PDF.</p>;
  return (
    <div className="space-y-2">
      <p className="text-sm text-ink-soft">Overall {block.overall}%. Scores come from the audit results and update when you re-run the audit.</p>
      <Labeled label="Introduction"><textarea className={`${inputCls} min-h-20`} value={block.intro} disabled={ctx.disabled} onChange={(e) => onChange({ ...block, intro: e.target.value })} /></Labeled>
    </div>
  );
}

/** Applies AI generated text to a section as a new block, according to the command. */
export function blockFromGenerated(command: AssistCommand, result: string): Block {
  const t = result.trim();
  if (command === "deliverables") return { id: newId(), type: "list", style: "bullet", items: lines(t) };
  if (command === "timeline") {
    return { id: newId(), type: "timeline", items: lines(t).map((l) => { const [phase, duration, ...rest] = l.split("|").map((x) => x.trim()); return { id: newId(), phase: phase ?? l, duration: duration ?? "", description: rest.join(" | ") }; }) };
  }
  return { id: newId(), type: "paragraph", content: t };
}

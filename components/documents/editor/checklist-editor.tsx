"use client";

import { Plus } from "lucide-react";
import { Labeled, MoveControls, inputCls, move } from "./ui";
import { newId, type Block } from "@/lib/documents/content";
import { checklistScore, type ChecklistStatus } from "@/lib/social/score";
import { cn } from "@/lib/utils";

type C = Extract<Block, { type: "checklist" }>;

const STATUSES: { value: ChecklistStatus; label: string; on: string }[] = [
  { value: "good", label: "Good", on: "bg-[#2f7d55] text-white border-[#2f7d55]" },
  { value: "needs_work", label: "Needs work", on: "bg-[#b08800] text-white border-[#b08800]" },
  { value: "poor", label: "Poor", on: "bg-[#b3261e] text-white border-[#b3261e]" },
  { value: "na", label: "N/A", on: "bg-[#6b7280] text-white border-[#6b7280]" },
];

/** The auditor's working view: mark each checkpoint, add notes and a recommendation, and add checkpoints of their own. */
export function ChecklistEditor({ block, onChange, disabled }: { block: C; onChange: (b: C) => void; disabled: boolean }) {
  const set = (fn: (b: C) => void) => { const c = structuredClone(block); fn(c); onChange(c); };
  const r = checklistScore(block.items.filter((i) => i.item.trim()));
  const checkedCount = block.items.filter((i) => i.status !== "unchecked").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-ink-soft">
        <span>{checkedCount} of {block.items.length} reviewed</span>
        {r.score !== null && <span className="rounded bg-black/5 px-2 py-0.5 font-medium text-ink">Section score {r.score}%</span>}
      </div>

      {block.items.map((it, i) => (
        <div key={it.id} className={cn("rounded-md border p-2.5", it.status === "unchecked" ? "border-line bg-surface" : "border-line-strong bg-surface")}>
          <div className="flex items-start gap-2">
            <input className={`${inputCls} font-medium`} value={it.item} placeholder="Checkpoint" aria-label={`Checkpoint ${i + 1}`} disabled={disabled} onChange={(e) => set((b) => { b.items[i].item = e.target.value; })} />
            {!disabled && <MoveControls index={i} count={block.items.length} label="checkpoint" onMove={(to) => set((b) => move(b.items, i, to))} onRemove={() => set((b) => { b.items.splice(i, 1); })} />}
          </div>
          <div role="group" aria-label={`Status for checkpoint ${i + 1}`} className="mt-2 flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button key={s.value} type="button" disabled={disabled} aria-pressed={it.status === s.value}
                onClick={() => set((b) => { b.items[i].status = b.items[i].status === s.value ? "unchecked" : s.value; })}
                className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50", it.status === s.value ? s.on : "border-line-strong bg-surface text-ink-soft hover:bg-paper")}>
                {s.label}
              </button>
            ))}
            <select aria-label={`Priority for checkpoint ${i + 1}`} disabled={disabled} value={it.priority} onChange={(e) => set((b) => { b.items[i].priority = e.target.value as C["items"][number]["priority"]; })}
              className="ml-auto h-7 rounded-md border border-line-strong bg-surface px-2 text-xs">
              <option value="">Priority</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <textarea className={`${inputCls} min-h-14`} rows={2} value={it.note} placeholder="What you found" aria-label={`Observation for checkpoint ${i + 1}`} disabled={disabled} onChange={(e) => set((b) => { b.items[i].note = e.target.value; })} />
            <textarea className={`${inputCls} min-h-14`} rows={2} value={it.recommendation} placeholder="Recommended action" aria-label={`Recommendation for checkpoint ${i + 1}`} disabled={disabled} onChange={(e) => set((b) => { b.items[i].recommendation = e.target.value; })} />
          </div>
        </div>
      ))}

      {!disabled && (
        <button type="button" className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
          onClick={() => set((b) => { b.items.push({ id: newId(), item: "", status: "unchecked", priority: "", note: "", recommendation: "" }); })}><Plus className="size-3.5" aria-hidden />Add checkpoint</button>
      )}
      <Labeled label="Overall observation for this section (optional)">
        <textarea className={`${inputCls} min-h-16`} value={block.summary} disabled={disabled} placeholder="A short summary shown above the checklist" onChange={(e) => onChange({ ...block, summary: e.target.value })} />
      </Labeled>
    </div>
  );
}

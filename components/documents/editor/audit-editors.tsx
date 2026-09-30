"use client";

import { ScreenshotField } from "./screenshot-field";
import { Plus, Trash2 } from "lucide-react";
import { IconButton, Labeled, inputCls } from "./ui";
import { newId, type Block } from "@/lib/documents/content";

type F = Extract<Block, { type: "audit_findings" }>;
const SEVERITIES = ["critical", "high", "medium", "low", "passed"] as const;
const STATUSES = ["open", "fixed", "ignored", "passed"] as const;

export function AuditFindingsEditor({ block, onChange, disabled }: { block: F; onChange: (b: F) => void; disabled: boolean }) {
  const set = (fn: (b: F) => void) => { const c = structuredClone(block); fn(c); onChange(c); };
  return (
    <div className="space-y-2">
      {block.findings.map((f, i) => (
        <details key={f.id} className="rounded-md border border-line">
          <summary className="flex cursor-pointer items-center gap-2 px-2.5 py-2 text-sm"><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white ${{ critical: "bg-[#b3261e]", high: "bg-[#d9631b]", medium: "bg-[#b08800]", low: "bg-[#4a6fa5]", passed: "bg-[#2f7d55]" }[f.severity]}`}>{f.severity}</span><span className="truncate">{f.issue || "Untitled finding"}</span></summary>
          <div className="space-y-2 border-t border-line p-2.5">
            <Labeled label="Issue"><input className={inputCls} value={f.issue} disabled={disabled} onChange={(e) => set((b) => { b.findings[i].issue = e.target.value; })} /></Labeled>
            <div className="grid grid-cols-2 gap-2">
              <Labeled label="Severity"><select className={inputCls} value={f.severity} disabled={disabled} onChange={(e) => set((b) => { b.findings[i].severity = e.target.value as (typeof SEVERITIES)[number]; })}>{SEVERITIES.map((s) => <option key={s}>{s}</option>)}</select></Labeled>
              <Labeled label="Status"><select className={inputCls} value={f.status} disabled={disabled} onChange={(e) => set((b) => { b.findings[i].status = e.target.value as (typeof STATUSES)[number]; })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Labeled>
            </div>
            <Labeled label="Why it matters"><textarea className={`${inputCls} min-h-16`} value={f.explanation} disabled={disabled} onChange={(e) => set((b) => { b.findings[i].explanation = e.target.value; })} /></Labeled>
            <Labeled label="Recommended action"><textarea className={`${inputCls} min-h-16`} value={f.recommendation} disabled={disabled} onChange={(e) => set((b) => { b.findings[i].recommendation = e.target.value; })} /></Labeled>
            <Labeled label="Affected pages"><input className={inputCls} value={f.affectedUrl} disabled={disabled} onChange={(e) => set((b) => { b.findings[i].affectedUrl = e.target.value; })} /></Labeled>
            <Labeled label="Screenshot"><ScreenshotField value={f.screenshot} disabled={disabled} onChange={(u) => set((b) => { b.findings[i].screenshot = u; })} /></Labeled>
            <IconButton label="Remove finding" danger disabled={disabled} onClick={() => set((b) => { b.findings.splice(i, 1); })}><Trash2 className="size-3.5" /></IconButton>
          </div>
        </details>
      ))}
      <button type="button" disabled={disabled} className="inline-flex items-center gap-1 text-xs text-brand hover:underline disabled:opacity-40"
        onClick={() => set((b) => { b.findings.push({ id: newId("f"), issue: "", severity: "medium", explanation: "", recommendation: "", affectedUrl: "", status: "open" }); })}><Plus className="size-3" aria-hidden />Add finding</button>
    </div>
  );
}

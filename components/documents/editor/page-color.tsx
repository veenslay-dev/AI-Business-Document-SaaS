"use client";

import { useEffect, useRef, useState } from "react";
import { PaintBucket } from "lucide-react";

const SWATCHES = ["#ffffff", "#faf7f2", "#f3f6fb", "#eef6f1", "#fff8e6", "#fbeff0", "#1a1d24", "#0f172a"];

/** Button and small popover to color the whole document page. `null` means the default white. */
export function PageColorButton({ value, onChange, disabled }: { value: string | null; onChange: (hex: string | null) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) { if (e.key === "Escape") setOpen(false); return; }
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  return (
    <div className="relative" ref={box}>
      <button type="button" disabled={disabled} aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 text-sm hover:bg-paper disabled:opacity-50">
        <PaintBucket className="size-4" aria-hidden />Page color
        <span className="size-3.5 rounded-full border border-line-strong" style={{ background: value ?? "#ffffff" }} aria-hidden />
      </button>
      {open && (
        <div role="dialog" aria-label="Document background color" className="absolute right-0 z-30 mt-1 w-60 rounded-2xl border border-line bg-surface p-3 shadow-lg">
          <p className="mb-2 text-xs font-medium text-ink-soft">Background of the whole document</p>
          <div className="grid grid-cols-8 gap-1.5">
            {SWATCHES.map((c) => (
              <button key={c} type="button" aria-label={`Use ${c}`} onClick={() => onChange(c === "#ffffff" ? null : c)}
                className="size-6 rounded-full border border-line-strong outline-offset-2 focus-visible:outline-2" style={{ background: c, boxShadow: (value ?? "#ffffff") === c ? "0 0 0 2px var(--color-brand, #2563eb)" : undefined }} />
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-ink-soft">Custom
            <input type="color" value={value ?? "#ffffff"} onChange={(e) => onChange(e.target.value)} className="h-7 w-12 cursor-pointer rounded border border-line bg-transparent" aria-label="Custom background color" />
            <span className="font-mono">{value ?? "#ffffff"}</span>
          </label>
          <p className="mt-2 text-[11px] leading-snug text-ink-faint">Text and cards adjust automatically so they stay readable on dark colors.</p>
          {value && <button type="button" onClick={() => onChange(null)} className="mt-2 text-xs text-brand hover:underline">Reset to white</button>}
        </div>
      )}
    </div>
  );
}

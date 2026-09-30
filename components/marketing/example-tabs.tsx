"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function ExampleTabs({ panels }: { panels: { id: string; label: string; caption: string; node: React.ReactNode }[] }) {
  const [active, setActive] = useState(panels[0].id);
  return (
    <div>
      <div role="tablist" aria-label="Document examples" className="mb-6 flex flex-wrap gap-2">
        {panels.map((p) => (
          <button key={p.id} role="tab" id={`tab-${p.id}`} aria-selected={active === p.id} aria-controls={`panel-${p.id}`} onClick={() => setActive(p.id)}
            className={cn("rounded-full border px-4 py-1.5 text-sm transition-colors", active === p.id ? "border-brand bg-brand text-white" : "border-line-strong bg-surface hover:bg-paper")}>{p.label}</button>
        ))}
      </div>
      {panels.map((p) => (
        <div key={p.id} role="tabpanel" id={`panel-${p.id}`} aria-labelledby={`tab-${p.id}`} hidden={active !== p.id}>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start">
            <p className="text-ink-soft lg:pt-4">{p.caption}</p>
            <div className="min-w-0 max-w-[640px]">{p.node}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

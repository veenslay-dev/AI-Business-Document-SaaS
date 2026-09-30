"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function IconButton({ label, onClick, disabled, children, danger }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode; danger?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className={cn("grid size-7 place-items-center rounded text-ink-soft hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent", danger && "hover:text-signal")}>
      {children}
    </button>
  );
}

export function MoveControls({ index, count, onMove, onRemove, label }: { index: number; count: number; onMove: (to: number) => void; onRemove: () => void; label: string }) {
  return (
    <div className="flex items-center">
      <IconButton label={`Move ${label} up`} disabled={index === 0} onClick={() => onMove(index - 1)}><ArrowUp className="size-3.5" /></IconButton>
      <IconButton label={`Move ${label} down`} disabled={index === count - 1} onClick={() => onMove(index + 1)}><ArrowDown className="size-3.5" /></IconButton>
      <IconButton label={`Remove ${label}`} danger onClick={onRemove}><Trash2 className="size-3.5" /></IconButton>
    </div>
  );
}

export const inputCls = "w-full rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-sm shadow-soft placeholder:text-ink-faint focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 disabled:bg-paper";

export function Labeled({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={cn("block space-y-1", className)}><span className="text-xs font-medium text-ink-soft">{label}</span>{children}</label>;
}

export function move<T>(arr: T[], from: number, to: number) {
  if (to < 0 || to >= arr.length) return;
  const [item] = arr.splice(from, 1);
  arr.splice(to, 0, item);
}

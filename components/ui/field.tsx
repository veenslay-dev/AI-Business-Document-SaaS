import * as React from "react";
import { cn } from "@/lib/utils";

export function Field({
  label, htmlFor, error, hint, children, className,
}: {
  label: string; htmlFor: string; error?: string; hint?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-ink-faint">{hint}</p>}
      {error && <p role="alert" className="text-xs text-signal">{error}</p>}
    </div>
  );
}

export function FormMessage({ kind, children }: { kind: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "border-signal/30 bg-signal-soft text-[#7d2a16]",
    success: "border-ok/30 bg-ok-soft text-ok",
    info: "border-line-strong bg-white text-ink-soft",
  }[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cn("rounded-md border px-3 py-2 text-sm", styles)}>
      {children}
    </div>
  );
}

import { cn } from "@/lib/utils";

const TONES = {
  neutral: "bg-black/5 text-ink-soft",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  signal: "bg-signal-soft text-signal",
  brand: "bg-[#dfe6f3] text-brand",
} as const;

export function Badge({ tone = "neutral", className, children }: { tone?: keyof typeof TONES; className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium", TONES[tone], className)}>{children}</span>;
}

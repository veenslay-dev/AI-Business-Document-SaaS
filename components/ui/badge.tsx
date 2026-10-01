import { cn } from "@/lib/utils";

const TONES = {
  neutral: "bg-black/5 text-ink-soft",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  signal: "bg-signal-soft text-signal",
  brand: "bg-brand-soft text-brand",
  info: "bg-info-soft text-info",
} as const;

export function Badge({ tone = "neutral", className, children }: { tone?: keyof typeof TONES; className?: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", TONES[tone], className)}>{children}</span>;
}

import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLAN_CARDS } from "@/lib/marketing";
import { cn } from "@/lib/utils";

export function PlanGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {PLAN_CARDS.map((p) => (
        <article key={p.id} className={cn("flex flex-col rounded-2xl border bg-surface p-7", p.highlight ? "border-2 border-brand shadow-pop md:-mt-3 md:pb-9" : "border-line shadow-soft")}>
          <h3 className="flex items-center justify-between font-bold">{p.name}{p.highlight && <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-white">Most popular</span>}</h3>
          <p className="mt-3 text-4xl font-extrabold">{p.price === "0" ? "$0" : p.price}</p>
          <p className="text-xs text-ink-faint">{p.note}</p>
          <p className="mt-3 text-sm text-ink-soft">{p.blurb}</p>
          <ul className="mt-5 flex-1 space-y-2 text-sm">{p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />{f}</li>)}</ul>
          <Button asChild className="mt-6" variant={p.highlight ? "primary" : "secondary"}><Link href="/signup">{p.cta}</Link></Button>
        </article>
      ))}
    </div>
  );
}

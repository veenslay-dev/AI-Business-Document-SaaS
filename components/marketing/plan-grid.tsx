import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLAN_CARDS } from "@/lib/marketing";
import { cn } from "@/lib/utils";

export function PlanGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {PLAN_CARDS.map((p) => (
        <article key={p.id} className={cn("flex flex-col rounded-lg border bg-paper p-6", p.highlight ? "border-brand shadow-pop" : "border-line")}>
          <h3 className="font-semibold">{p.name}</h3>
          <p className="mt-3 font-serif text-3xl">{p.price === "0" ? "$0" : p.price}</p>
          <p className="text-xs text-ink-faint">{p.note}</p>
          <p className="mt-3 text-sm text-ink-soft">{p.blurb}</p>
          <ul className="mt-5 flex-1 space-y-2 text-sm">{p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />{f}</li>)}</ul>
          <Button asChild className="mt-6" variant={p.highlight ? "primary" : "secondary"}><Link href="/signup">{p.cta}</Link></Button>
        </article>
      ))}
    </div>
  );
}

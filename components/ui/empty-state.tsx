import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center">
      <span className="mb-3 grid size-10 place-items-center rounded-full bg-black/5"><Icon className="size-5 text-ink-soft" aria-hidden /></span>
      <h2 className="font-semibold">{title}</h2>
      {children && <p className="mt-1 max-w-sm text-sm text-ink-soft">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

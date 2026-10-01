import { cn } from "@/lib/utils";

/** Product wordmark. Change the name in one place. */
export const PRODUCT_NAME = "Docuzumo";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-ink", className)}>
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-brand text-white shadow-soft">
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 14h6M9 17.5h4" /></svg>
      </span>
      {PRODUCT_NAME}
    </span>
  );
}

import { cn } from "@/lib/utils";

/** Product wordmark. Change the name in one place. */
export const PRODUCT_NAME = "DocuPro AI";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span aria-hidden className="grid size-6 place-items-center rounded bg-brand text-[11px] font-bold text-white">D</span>
      {PRODUCT_NAME}
    </span>
  );
}

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ page, total, pageSize, basePath, params }: {
  page: number; total: number; pageSize: number; basePath: string; params?: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const cls = "inline-flex h-8 items-center gap-1 rounded-md border border-line-strong bg-surface px-3 text-sm hover:bg-paper";
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm text-ink-soft">
      <span>Page {page} of {pages} · {total} total</span>
      <div className="flex gap-2">
        {page > 1 && <Link href={href(page - 1)} className={cls}><ChevronLeft className="size-4" aria-hidden />Previous</Link>}
        {page < pages && <Link href={href(page + 1)} className={cls}>Next<ChevronRight className="size-4" aria-hidden /></Link>}
      </div>
    </nav>
  );
}

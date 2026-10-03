import type { FaqItem } from "@/lib/content/faq";

/** The Questions section. The same list feeds the page's FAQ schema, so what people read and what search engines read match. */
export function FaqSection({ items, title = "Frequently asked questions", className = "" }: { items: FaqItem[]; title?: string; className?: string }) {
  if (!items.length) return null;
  return (
    <section id="faq" className={`mx-auto max-w-3xl scroll-mt-8 px-5 py-16 ${className}`}>
      <h2 className="text-3xl font-extrabold">{title}</h2>
      <div className="mt-8 divide-y divide-line border-y border-line">
        {items.map((f) => (
          <details key={f.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">{f.q}<span aria-hidden className="text-ink-faint transition-transform group-open:rotate-45">+</span></summary>
            <p className="mt-2 text-ink-soft">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

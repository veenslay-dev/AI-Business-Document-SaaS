import Link from "next/link";
import { PRODUCT_NAME } from "@/components/ui/logo";
import { LEGAL_UPDATED, operator } from "@/lib/legal";

export type LegalSection = { id: string; title: string; body: React.ReactNode };

const LINKS = [["/terms", "Terms of Service"], ["/privacy", "Privacy Policy"], ["/refund-policy", "Refund Policy"]] as const;

/** Shared layout for the legal pages: a contents list on wide screens and a Contact link at the end. */
export function LegalPage({ current, title, intro, sections }: { current: string; title: string; intro: React.ReactNode; sections: LegalSection[] }) {
  const op = operator();
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <header className="max-w-3xl">
        <h1 className="text-4xl font-extrabold">{title}</h1>
        <p className="mt-2 text-sm text-ink-faint">Last updated {LEGAL_UPDATED}</p>
        <div className="mt-5 space-y-3 text-ink-soft">{intro}</div>
      </header>
      <div className="mt-10 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav aria-label="On this page" className="sticky top-6 space-y-1 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">On this page</p>
            {sections.map((s, i) => <a key={s.id} href={`#${s.id}`} className="block rounded px-2 py-1 text-ink-soft hover:text-brand">{i + 1}. {s.title}</a>)}
          </nav>
        </aside>
        <article className="max-w-3xl space-y-9 text-[15px] leading-7 text-ink-soft">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 space-y-3">
              <h2 className="text-xl font-bold text-ink">{i + 1}. {s.title}</h2>
              {s.body}
            </section>
          ))}
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-soft">
            <h2 className="text-lg font-bold text-ink">Questions about this page?</h2>
            <p className="mt-2">Send us a message and we will reply by email, usually within one working day.</p>
            <p className="mt-4"><Link href="/contact" className="inline-flex h-10 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover">Contact us</Link></p>
            <p className="mt-4 text-xs text-ink-faint">{PRODUCT_NAME} is operated by {op.name}.{op.address ? ` ${op.address}.` : ""}{op.email ? <> Email: <a className="text-brand hover:underline" href={`mailto:${op.email}`}>{op.email}</a>.</> : null}</p>
          </section>
          <nav aria-label="Legal pages" className="flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-5 text-sm">
            {LINKS.filter(([href]) => href !== current).map(([href, label]) => <Link key={href} href={href} className="text-brand hover:underline">{label}</Link>)}
          </nav>
        </article>
      </div>
    </main>
  );
}

export const P = ({ children }: { children: React.ReactNode }) => <p>{children}</p>;
export const UL = ({ items }: { items: React.ReactNode[] }) => <ul className="list-disc space-y-1.5 pl-5">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;
export const A = ({ href, children }: { href: string; children: React.ReactNode }) => <Link href={href} className="font-medium text-brand hover:underline">{children}</Link>;

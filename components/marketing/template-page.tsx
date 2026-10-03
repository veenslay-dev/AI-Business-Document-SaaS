import Link from "next/link";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import { PageSchema } from "@/components/seo/page-schema";
import { TemplateSample } from "@/components/marketing/template-sample";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth/session";
import { FaqSection } from "@/components/marketing/faq-section";
import { PAGE_FAQ } from "@/lib/content/faq";
import { Markdown } from "@/lib/seo/markdown";
import { getPageContent } from "@/lib/seo/pages";
import { TEMPLATE_HUB, TEMPLATE_PAGES, type TemplatePage } from "@/lib/seo/templates";

/** One template's page: the sample, what is in it, how to use it, tips and questions. */
export async function TemplateDetail({ tpl }: { tpl: TemplatePage }) {
  const signedIn = !!(await getUser());
  const c = await getPageContent(tpl.path);
  const start = signedIn ? { href: tpl.appPath, label: "Use this template" } : { href: "/signup", label: "Use this template free" };
  const others = TEMPLATE_PAGES.filter((t) => t.slug !== tpl.slug);
  return (
    <main>
      <PageSchema path={tpl.path} />
      <div className="mx-auto max-w-7xl px-5 pt-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-ink-faint">
          <Link href="/" className="hover:text-brand">Home</Link><ChevronRight className="size-3.5" aria-hidden />
          <Link href={TEMPLATE_HUB.path} className="hover:text-brand">Templates</Link><ChevronRight className="size-3.5" aria-hidden />
          <span aria-current="page" className="text-ink-soft">{tpl.name}</span>
        </nav>
      </div>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
        <div>
          <h1 className="text-4xl font-extrabold leading-[1.1] sm:text-5xl">{c.heading ?? tpl.h1}</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">{c.intro ?? tpl.intro}</p>
          <p className="mt-4 text-sm text-ink-soft"><span className="font-semibold text-ink">Best for:</span> {tpl.bestFor}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-7"><Link href={start.href}>{start.label}<ArrowRight className="size-4" aria-hidden /></Link></Button>
            <Button asChild size="lg" variant="secondary" className="rounded-full px-7"><Link href={TEMPLATE_HUB.path}>All templates</Link></Button>
          </div>
          <h2 className="mt-12 text-2xl font-extrabold">What is inside</h2>
          <ul className="mt-4 space-y-2.5 text-ink-soft">
            {tpl.includes.map((x) => <li key={x} className="flex gap-3"><Check className="mt-1 size-4 shrink-0 text-brand" aria-hidden />{x}</li>)}
          </ul>
        </div>
        <figure className="min-w-0">
          <TemplateSample slug={tpl.slug} height={tpl.previewHeight ?? 1180} />
          <figcaption className="mt-3 text-xs text-ink-faint">{tpl.sampleNote}</figcaption>
        </figure>
      </section>

      <section className="bg-brand-soft/50">
        <div className="mx-auto max-w-7xl px-5 py-16">
          <h2 className="text-3xl font-extrabold">How to use it</h2>
          <ol className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {tpl.steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl bg-surface p-6 shadow-soft">
                <span className="mb-3 grid size-9 place-items-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
                <h3 className="font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-ink-soft">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-extrabold">Tips for a better document</h2>
          <ul className="mt-5 space-y-3 text-ink-soft">{tpl.tips.map((t) => <li key={t} className="flex gap-3"><Check className="mt-1 size-4 shrink-0 text-brand" aria-hidden />{t}</li>)}</ul>
        </div>
        <div>
          <h2 className="text-2xl font-extrabold">Questions</h2>
          <div className="mt-5 divide-y divide-line border-y border-line">
            {tpl.faq.map((f) => (
              <details key={f.q} className="group py-4"><summary className="cursor-pointer list-none font-medium">{f.q}</summary><p className="mt-2 text-sm text-ink-soft">{f.a}</p></details>
            ))}
          </div>
        </div>
      </section>

      {c.extraMd && <section className="mx-auto max-w-3xl px-5 pb-12 text-ink-soft"><Markdown md={c.extraMd} /></section>}

      <section className="mx-auto max-w-7xl px-5 pb-20">
        <h2 className="text-2xl font-extrabold">More templates</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-3">
          {others.map((t) => (
            <li key={t.slug}><Link href={t.path} className="block h-full rounded-2xl border border-line bg-surface p-5 shadow-soft hover:border-brand"><p className="font-bold">{t.name}</p><p className="mt-1 text-sm text-ink-soft">{t.bestFor}</p></Link></li>
          ))}
        </ul>
        <div className="mt-12 rounded-2xl bg-brand-soft/60 p-8 text-center">
          <h2 className="text-2xl font-extrabold">Start with this template</h2>
          <p className="mx-auto mt-2 max-w-xl text-ink-soft">Set your brand once and every document uses it. The Free plan needs no card.</p>
          <div className="mt-5"><Button asChild size="lg" className="rounded-full px-8"><Link href={start.href}>{start.label}</Link></Button></div>
        </div>
      </section>
    </main>
  );
}

/** The Templates page: a card for every template with a preview and a link to its own page. */
export async function TemplateHub() {
  const c = await getPageContent(TEMPLATE_HUB.path);
  return (
    <main>
      <PageSchema path={TEMPLATE_HUB.path} />
      <section className="mx-auto max-w-4xl px-5 pb-10 pt-14 text-center">
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">{c.heading ?? TEMPLATE_HUB.h1}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-soft">{c.intro ?? TEMPLATE_HUB.intro}</p>
      </section>
      <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-16 md:grid-cols-2">
        {TEMPLATE_PAGES.map((t) => (
          <article key={t.slug} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
            <Link href={t.path} aria-label={`Open the ${t.name}`} className="block bg-brand-soft/40 px-6 pt-6"><TemplateSample slug={t.slug} height={420} /></Link>
            <div className="flex flex-1 flex-col p-6">
              <h2 className="text-xl font-extrabold"><Link href={t.path} className="hover:text-brand">{t.name}</Link></h2>
              <p className="mt-2 flex-1 text-sm text-ink-soft">{t.description}</p>
              <p className="mt-3 text-xs text-ink-faint"><span className="font-semibold text-ink-soft">Best for:</span> {t.bestFor}</p>
              <div className="mt-5"><Button asChild variant="secondary"><Link href={t.path}>{t.name}<ArrowRight className="size-4" aria-hidden /></Link></Button></div>
            </div>
          </article>
        ))}
      </section>
      {c.extraMd && <section className="mx-auto max-w-3xl px-5 pb-12 text-ink-soft"><Markdown md={c.extraMd} /></section>}
      <FaqSection items={PAGE_FAQ[TEMPLATE_HUB.path]} title="Template questions" />

      <section className="bg-brand-soft/50">
        <div className="mx-auto max-w-3xl px-5 py-14 text-center">
          <h2 className="text-2xl font-extrabold">Your branding on every one</h2>
          <p className="mt-2 text-ink-soft">Add your logo, colors, fonts, GST details and terms once. Every template picks them up, so a new document starts looking like yours.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="rounded-full px-7"><Link href="/signup">Start Free</Link></Button>
            <Button asChild size="lg" variant="secondary" className="rounded-full px-7"><Link href="/pricing">See pricing</Link></Button>
          </div>
        </div>
      </section>
    </main>
  );
}

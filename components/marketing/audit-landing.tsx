import Link from "next/link";
import { ArrowRight, BarChart3, Check, FileText, Link2, ListChecks, Palette, X } from "lucide-react";
import { PageSchema } from "@/components/seo/page-schema";
import { FaqSection } from "@/components/marketing/faq-section";
import { OwnSiteAudit, sampleAuditInfo } from "@/components/marketing/own-site-audit";
import { PlanTable } from "@/components/marketing/plan-table";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth/session";
import { PAGE_FAQ } from "@/lib/content/faq";
import { Markdown } from "@/lib/seo/markdown";
import { getPageContent } from "@/lib/seo/pages";
import { AUDIT_LANDING as L } from "@/lib/seo/audit-landing";

const H2 = "text-3xl font-extrabold leading-tight";

export async function AuditLanding() {
  const signedIn = !!(await getUser());
  const c = await getPageContent(L.path);
  const sample = await sampleAuditInfo();
  const start = signedIn ? { href: "/seo-audits/new", label: "Run an audit" } : { href: "/signup", label: "Try it free" };

  return (
    <main>
      <PageSchema path={L.path} />

      {/* 1. Hero */}
      <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:pt-16">
        <div>
          <p className="mb-5 inline-block rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-semibold text-brand">SEO audit tool for agencies and freelancers</p>
          <h1 className="text-4xl font-extrabold leading-[1.1] sm:text-5xl">{c.heading ?? L.h1}</h1>
          <p className="mt-5 text-xl font-semibold text-brand">{L.heroLine}</p>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">{c.intro ?? L.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-7"><Link href={start.href}>{start.label}<ArrowRight className="size-4" aria-hidden /></Link></Button>
            <Button asChild size="lg" variant="secondary" className="rounded-full px-7"><Link href="#sample">See a sample report</Link></Button>
          </div>
          {!signedIn && <p className="mt-4 text-sm text-ink-faint">{L.freeNote}</p>}
        </div>
        <aside className="h-fit rounded-2xl border border-line bg-surface p-6 shadow-soft" aria-label="What every report includes">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">In every report</p>
          <ul className="mt-4 space-y-4 text-sm">
            {([[BarChart3, "A health score for each category", "and one overall score for the site."], [ListChecks, "Findings with fixes", "priority, why it matters and what to do."], [Palette, "Your brand", "logo, colors and fonts on every page."], [Link2, "A tracked link or a PDF", "see when the report is opened."]] as const).map(([Icon, t, d]) => (
              <li key={t} className="flex gap-3"><span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Icon className="size-4" /></span><span><strong className="block text-ink">{t}</strong><span className="text-ink-soft">{d}</span></span></li>
            ))}
          </ul>
        </aside>
      </section>

      {/* 2. What's inside */}
      <section className="bg-brand-soft/50" aria-labelledby="inside">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <h2 id="inside" className={H2}>What's inside the SEO audit report</h2>
          <p className="mt-3 max-w-3xl text-ink-soft">{L.scope}</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {L.groups.map((g) => (
              <div key={g.title} className="rounded-2xl bg-surface p-6 shadow-soft">
                <h3 className="font-bold">{g.title}</h3>
                <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">{g.checks.map(([id, name]) => <li key={id} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />{name}</li>)}</ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-ink-faint">{L.pageSpeedNote}</p>
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="text-xl font-bold">Also in the report</h3>
              <ul className="mt-3 space-y-2 text-ink-soft">{L.alsoInReport.map((x) => <li key={x} className="flex gap-3"><Check className="mt-1 size-4 shrink-0 text-brand" aria-hidden />{x}</li>)}</ul>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-soft">
              <h3 className="flex items-center gap-2 text-xl font-bold"><X className="size-5 text-signal" aria-hidden />What the scan does not do</h3>
              <p className="mt-3 text-ink-soft">{L.notIncluded}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Sample report */}
      <section id="sample" className="mx-auto max-w-7xl scroll-mt-8 px-5 py-20" aria-labelledby="sample-h">
        <h2 id="sample-h" className={H2}>See a sample SEO audit report</h2>
        {sample ? (
          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:items-start">
            <figure className="min-w-0"><OwnSiteAudit height={1180} /><figcaption className="mt-3 text-xs text-ink-faint">{L.sample.live(sample.host, sample.date)}</figcaption></figure>
            <div>
              <p className="text-ink-soft">This is the report a lead receives: a health score for each category, then the findings with their priority and the fix for each, then the checklist and next steps. Yours will carry your own logo and colors.</p>
              <div className="mt-6"><Button asChild size="lg" className="rounded-full px-7"><Link href={start.href}>{signedIn ? "Run an audit" : "Run the same audit on your site"}<ArrowRight className="size-4" aria-hidden /></Link></Button></div>
            </div>
          </div>
        ) : (
          <div className="mt-6 max-w-3xl">
            <p className="text-ink-soft">{L.sample.none}</p>
            <div className="mt-6"><Button asChild size="lg" className="rounded-full px-7"><Link href={start.href}>{start.label}<ArrowRight className="size-4" aria-hidden /></Link></Button></div>
          </div>
        )}
      </section>

      {/* 4. How it works */}
      <section className="bg-brand-soft/50" aria-labelledby="how">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <h2 id="how" className={H2}>How to create an SEO audit report in PrioDraft</h2>
          <ol className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {L.steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl bg-surface p-6 shadow-soft">
                <span className="mb-3 grid size-9 place-items-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
                <h3 className="font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-ink-soft">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5. Branded reports */}
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-2" aria-labelledby="branded">
        <div>
          <h2 id="branded" className={H2}>Branded SEO audit reports for your clients</h2>
          <p className="mt-3 text-ink-soft">{L.branded.intro}</p>
        </div>
        <ul className="space-y-3 text-ink-soft">{L.branded.points.map((x) => <li key={x} className="flex gap-3"><Check className="mt-1 size-4 shrink-0 text-brand" aria-hidden />{x}</li>)}</ul>
      </section>

      {/* 6. Audit to proposal */}
      <section className="bg-gradient-to-br from-brand-deep via-[#7a0f16] to-brand text-white" aria-labelledby="workflow">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-2">
          <div>
            <h2 id="workflow" className={H2}>From SEO audit to proposal and quotation</h2>
            <p className="mt-3 text-white/80">{L.workflow.intro}</p>
            <p className="mt-5 rounded-xl bg-white/10 p-4 text-sm text-white/90">{L.workflow.story}</p>
            <p className="mt-5 text-sm text-white/80">See the <Link href="/document-templates/seo-proposal" className="font-semibold underline underline-offset-2">SEO proposal template</Link> and the <Link href="/document-templates/website-quotation-gst" className="font-semibold underline underline-offset-2">quotation format with GST</Link>.</p>
          </div>
          <ol className="space-y-3">
            {L.workflow.flow.map((x, i) => (
              <li key={x} className="flex gap-4 rounded-xl bg-white/10 p-4"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-brand">{i + 1}</span><span className="text-sm text-white/90">{x}</span></li>
            ))}
          </ol>
        </div>
      </section>

      {/* 7. Audiences */}
      <section className="mx-auto max-w-7xl px-5 py-20" aria-labelledby="audience">
        <h2 id="audience" className={H2}>Built for agencies, freelancers and consultants</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {L.audiences.map((a) => (
            <div key={a.title} className="rounded-2xl border border-line bg-surface p-6 shadow-soft"><h3 className="font-bold">{a.title}</h3><p className="mt-2 text-sm text-ink-soft">{a.body}</p></div>
          ))}
        </div>
      </section>

      {/* 8. Pricing */}
      <section className="bg-brand-soft/50" aria-labelledby="pricing">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <h2 id="pricing" className={H2}>SEO audit tool pricing in INR</h2>
          <p className="mt-3 max-w-3xl text-ink-soft">{L.pricing.intro}</p>
          <div className="mt-6"><PlanTable /></div>
          <ul className="mt-6 grid gap-3 text-sm text-ink-soft md:grid-cols-2">
            <li className="rounded-xl border border-line bg-surface p-4"><strong className="text-ink">Flat seats, not per user. </strong>{L.pricing.flatSeats}</li>
            <li className="rounded-xl border border-line bg-surface p-4"><strong className="text-ink">What counts. </strong>{L.pricing.counting}</li>
          </ul>
          <p className="mt-5 text-sm text-ink-soft">See the full <Link href="/pricing" className="font-semibold text-brand hover:underline">pricing page</Link> for billing and refunds.</p>
        </div>
      </section>

      {/* 9. Comparison */}
      <section className="mx-auto max-w-7xl px-5 py-20" aria-labelledby="compare">
        <h2 id="compare" className={H2}>PrioDraft vs SEOptimer and SE Ranking</h2>
        <p className="mt-3 max-w-3xl text-ink-soft">{L.comparison.intro}</p>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">PrioDraft compared with SEOptimer and SE Ranking</caption>
            <thead className="border-b border-line bg-brand-soft/40"><tr><th scope="col" className="px-4 py-3 font-semibold">Feature</th>{L.comparison.columns.map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>{L.comparison.rows.map((r) => (
              <tr key={r.topic} className="border-b border-line align-top last:border-0"><th scope="row" className="px-4 py-3 font-medium text-ink">{r.topic}</th>{r.cells.map((cell, i) => <td key={i} className="px-4 py-3 text-ink-soft">{cell}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
        <p className="mt-5 max-w-3xl text-ink-soft">{L.comparison.where}</p>
        <p className="mt-3 text-xs text-ink-faint">{L.comparison.note} {L.comparison.links.map(([n, h], i) => <span key={n}>{i > 0 ? ", " : ""}<a href={h} target="_blank" rel="noopener noreferrer nofollow" className="text-brand hover:underline">{n}</a></span>)}.</p>
      </section>

      {/* 10. FAQ */}
      <div className="bg-brand-soft/50"><FaqSection items={PAGE_FAQ[L.path]} title="SEO audit report questions" /></div>

      {c.extraMd && <section className="mx-auto max-w-3xl px-5 pt-12 text-ink-soft"><Markdown md={c.extraMd} /></section>}

      {/* 11. Final CTA */}
      <section className="mx-auto max-w-3xl px-5 py-20 text-center" aria-labelledby="final">
        <h2 id="final" className={H2}>{L.heroLine}</h2>
        <p className="mt-3 text-ink-soft">{signedIn ? "Open a new audit and send your lead a report today." : L.freeNote}</p>
        <div className="mt-6"><Button asChild size="lg" className="rounded-full px-8"><Link href={start.href}>{start.label}<ArrowRight className="size-4" aria-hidden /></Link></Button></div>
        <p className="mt-4 text-xs text-ink-faint"><FileText className="mr-1 inline size-3.5" aria-hidden />Looking for other documents? See the <Link href="/document-templates" className="text-brand hover:underline">document templates</Link>.</p>
      </section>
    </main>
  );
}

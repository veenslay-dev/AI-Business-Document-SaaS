import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Check, FileText, LayoutTemplate, Palette, PlayCircle, Share2, Sparkles } from "lucide-react";
import { DocumentRenderer } from "@/components/documents/document-renderer";
import { CroppedPreview } from "@/components/marketing/cropped-preview";
import { ExampleTabs } from "@/components/marketing/example-tabs";
import { PlanGrid } from "@/components/marketing/plan-grid";
import { Button } from "@/components/ui/button";
import { PRODUCT_NAME } from "@/components/ui/logo";
import { ACME_BRAND, HARBOR_BRAND, sampleAudit, sampleProposal, sampleQuotation, sampleSocialAudit } from "@/lib/documents/samples";
import { getSystemTemplate, type TemplateConfig } from "@/lib/documents/templates";
import type { DocumentContent } from "@/lib/documents/content";
import { FAQ, FEATURES } from "@/lib/marketing";
import { getUser } from "@/lib/auth/session";
import { siteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: `${PRODUCT_NAME}: branded proposals, quotations and SEO audits` },
  description: "Build your company profile once. Generate branded proposals, quotations and SEO audits in minutes with AI, share them by link and see when clients open and accept them.",
  alternates: { canonical: "/" },
  openGraph: { title: `${PRODUCT_NAME}: create once, brand everything`, description: "Proposals, quotations and audits that look like your company made them.", type: "website", url: "/" },
  twitter: { card: "summary_large_image" },
};

const FEATURE_ICONS = [Palette, LayoutTemplate, Sparkles, FileText, Share2, BarChart3];

const cfg = (key: string, over: Partial<TemplateConfig> = {}): TemplateConfig => ({ ...getSystemTemplate(key)!.config, ...over });

function only(content: DocumentContent, titles: string[]): DocumentContent {
  return { ...content, sections: content.sections.filter((s) => titles.includes(s.title)) };
}

export default async function HomePage() {
  const signedIn = !!(await getUser());
  const start = signedIn ? { href: "/dashboard", label: "Go to dashboard" } : { href: "/signup", label: "Start Free" };
  const proposal = sampleProposal();
  const investment = only(proposal, ["Timeline", "Investment"]);
  const RED_BRAND = { ...ACME_BRAND, brand: { ...ACME_BRAND.brand, primary: "#dc1c26", header: "#5a0b10", accent: "#dc1c26" } };
  const heroA = <DocumentRenderer content={proposal} brand={RED_BRAND} template={cfg("proposal-bold")} meta={{ type: "proposal" }} />;
  const heroB = <DocumentRenderer content={proposal} brand={HARBOR_BRAND} template={cfg("proposal-elegant")} meta={{ type: "proposal" }} />;
  const letter = cfg("proposal-modern", { cover: "none" });

  const jsonLd = [
    { "@context": "https://schema.org", "@type": "SoftwareApplication", name: PRODUCT_NAME, applicationCategory: "BusinessApplication", operatingSystem: "Web", url: siteUrl(),
      description: "Branded proposals, quotations and SEO audit reports generated with AI from a one-time company profile." },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  ];

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-24 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)] lg:pt-16">
        <div className="lg:pt-6">
          <p className="mb-5 inline-block rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-semibold text-brand">Create. Edit. Share. Professional documents.</p>
          <h1 className="text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-[3.4rem]">Create proposals, quotations and audits <span className="text-brand">that look like your company created them.</span></h1>
          <p className="mt-5 max-w-xl text-lg text-ink-soft">Build your company profile once. Generate branded client documents in minutes with AI.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-7"><Link href={start.href}>{start.label}<ArrowRight className="size-4" aria-hidden /></Link></Button>
            <Button asChild size="lg" variant="secondary" className="rounded-full px-7"><Link href="#how-it-works"><PlayCircle className="size-4" aria-hidden />See How It Works</Link></Button>
          </div>
          {!signedIn && <p className="mt-4 text-sm text-ink-faint">Free plan includes 10 documents and 3 AI actions a month, with PDF export.</p>}
        </div>
        <div className="relative hidden h-[520px] sm:block" aria-label="The same proposal in two different brands">
          <CroppedPreview label="Proposal cover in a deep red brand" height={560} className="absolute left-0 top-0 w-[320px] rounded-sm">{heroA}</CroppedPreview>
          <CroppedPreview label="The same proposal in a green and amber brand" height={560} className="absolute right-0 top-20 w-[300px] rounded-sm">{heroB}</CroppedPreview>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-8 bg-brand-soft/50">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <h2 className="text-center text-3xl font-extrabold">How it works</h2>
          <p className="mt-2 text-center text-ink-soft">Get professional documents in just 3 simple steps.</p>
          <ol className="mt-10 grid gap-10 md:grid-cols-3">
            {[
              ["Set up your company once", "Add your details, logo, colors, fonts, services, standard terms and signature. It takes about ten minutes and you don't repeat it."],
              ["Pick a client, describe the job", "Choose the client, write a few lines about the project and let the AI draft a structured proposal, or start a quotation or SEO audit."],
              ["Edit, share and track", "Adjust any section with a live preview, download the PDF or send a private link, and see when the client opens, accepts or asks for changes."],
            ].map(([t, b], i) => (
              <li key={t} className="rounded-2xl bg-surface p-6 shadow-soft"><span className="grid size-10 place-items-center rounded-full bg-brand text-lg font-bold text-white">{i + 1}</span><h3 className="mt-4 text-lg font-bold">{t}</h3><p className="mt-2 text-ink-soft">{b}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section id="examples" className="mx-auto max-w-7xl scroll-mt-8 px-5 py-20">
        <h2 className="text-3xl font-extrabold">What your clients receive</h2>
        <p className="mb-8 mt-2 max-w-2xl text-ink-soft">These pages are rendered by the same engine that produces your documents, using sample data for a fictional agency.</p>
        <ExampleTabs panels={[
          { id: "proposal", label: "Proposal", caption: "Proposals follow a sensible 13 part structure, but sections can be added, removed and reordered. Pricing packages sit next to itemised fees, with the recommended one highlighted.",
            node: <CroppedPreview label="Sample proposal page with timeline and pricing packages" height={900}><DocumentRenderer content={investment} brand={ACME_BRAND} template={letter} meta={{ type: "proposal" }} /></CroppedPreview> },
          { id: "quotation", label: "Quotation", caption: "A quotation here is a priced scope of work: overview, what is included, deliverables and timeline, then line items with per-line discounts and configurable tax, a payment schedule and acceptance. Totals are calculated in whole paise or cents in INR, USD, GBP or EUR.",
            node: <CroppedPreview label="Sample quotation with scope of work" height={900}><DocumentRenderer content={sampleQuotation()} brand={ACME_BRAND} template={cfg("quotation-executive")} meta={{ type: "quotation" }} /></CroppedPreview> },
          { id: "social", label: "Social media audit", caption: "A checklist audit you complete by hand while reviewing a client's accounts. Mark each checkpoint Good, Needs work or Poor, add notes and a recommendation, and the scorecard works itself out. Add your own sections for anything new you find.",
            node: <CroppedPreview label="Sample social media audit scorecard and checklist" height={900}><DocumentRenderer content={sampleSocialAudit()} brand={ACME_BRAND} template={cfg("social-audit-scorecard", { cover: "none", headerStyle: "studio" })} meta={{ type: "social_audit" }} /></CroppedPreview> },
          { id: "audit", label: "SEO audit", caption: "The scan produces scored categories and findings, each with why it matters, the recommended action, its priority and the pages affected. Edit anything before you send it.",
            node: <CroppedPreview label="Sample SEO audit summary and findings" height={900}><DocumentRenderer content={sampleAudit()} brand={ACME_BRAND} template={cfg("audit-seo-professional", { cover: "none" })} meta={{ type: "seo_audit" }} /></CroppedPreview> },
        ]} />
      </section>

      <section className="bg-brand-soft/50">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-extrabold">Your brand is set once and applied everywhere</h2>
            <p className="mt-3 text-ink-soft">Logo, colors, fonts, footer, contact details, terms and signature come from your brand kit, so no document ever carries a stale phone number or the wrong logo.</p>
            <ul className="mt-6 space-y-3 text-ink-soft">
              {["Change a color or your phone number and every new document uses it.", "When you share a document, its branding is saved with it, so past documents keep their original look.", "The same content works in any template. Switch layouts without rewriting anything."].map((t) => (
                <li key={t} className="flex gap-3"><Check className="mt-1 size-4 shrink-0 text-brand" aria-hidden /><span>{t}</span></li>))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <CroppedPreview label="Investment section in the navy brand" height={560} className="rounded-sm"><DocumentRenderer content={investment} brand={ACME_BRAND} template={letter} meta={{ type: "proposal" }} /></CroppedPreview>
            <CroppedPreview label="The same section in the green brand" height={560} className="mt-10 rounded-sm"><DocumentRenderer content={investment} brand={HARBOR_BRAND} template={cfg("proposal-corporate", { cover: "none" })} meta={{ type: "proposal" }} /></CroppedPreview>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl scroll-mt-8 px-5 py-20">
        <h2 className="text-3xl font-extrabold">What's inside</h2>
        <p className="mt-2 text-ink-soft">Everything you need to create professional client documents.</p>
        <dl className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => { const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length]; return (<div key={f.title} className="rounded-2xl border border-line bg-surface p-6 shadow-soft"><span aria-hidden className="mb-4 grid size-11 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="size-5" /></span><dt className="font-bold">{f.title}</dt><dd className="mt-1.5 text-sm text-ink-soft">{f.body}</dd></div>); })}
        </dl>
      </section>

      <section className="bg-gradient-to-br from-brand-deep via-[#7a0f16] to-brand text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold">AI that stays inside the facts you give it</h2>
            <p className="mt-3 text-white/75">The assistant reads your company profile, services and knowledge base, then writes in structured sections you can edit. It's told not to invent numbers, clients or awards. You always review before anything reaches a client.</p>
          </div>
          <ul className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {["Improve this section", "Make it more professional", "Make it shorter", "Make it more persuasive", "Simplify", "Add more detail", "Rewrite for US clients", "Rewrite for Indian clients", "Generate an FAQ", "Generate deliverables", "Generate a timeline", "Generate an executive summary"].map((c) => (
              <li key={c} className="flex gap-2 border-b border-white/15 py-2"><Check className="mt-0.5 size-4 shrink-0 text-[#ff9aa0]" aria-hidden />{c}</li>))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-center">
          <div>
            <h2 className="text-3xl font-extrabold">Know where every document stands</h2>
            <p className="mt-3 max-w-xl text-ink-soft">Each shared document has a private link. You see when it was opened and how long it stayed in view, when the PDF was downloaded, and whether the client accepted, declined or asked for changes. Tracking stores a hashed IP and the browser name, nothing more, and skips link-preview bots.</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft" aria-label="Example activity">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-faint">Sample activity</p>
            <ul className="space-y-3 text-sm">
              <li><strong>SEO growth plan for Nova Furniture</strong> was opened by the client<span className="block text-xs text-ink-faint">Viewed 2 times</span></li>
              <li><strong>SEO growth plan for Nova Furniture</strong> has a change request<span className="mt-1 block rounded bg-paper px-3 py-2 text-ink-soft">“Can you add a phased payment option?”</span></li>
              <li><strong>Website quotation</strong> was accepted by Dr. Kavya Nair</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-8 bg-brand-soft/50">
        <div className="mx-auto max-w-7xl px-5 py-20">
          <h2 className="text-3xl font-extrabold">Pricing</h2>
          <p className="mb-8 mt-2 max-w-xl text-ink-soft">Start free with 10 documents and 3 AI actions a month. Upgrade when you need more.</p>
          <PlanGrid signedIn={signedIn} />
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl scroll-mt-8 px-5 py-20">
        <h2 className="text-3xl font-extrabold">Questions</h2>
        <div className="mt-8 divide-y divide-line border-y border-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{f.q}<span aria-hidden className="text-ink-faint transition-transform group-open:rotate-45">+</span></summary><p className="mt-2 text-ink-soft">{f.a}</p></details>))}
        </div>
        <div className="mt-12 text-center"><Button asChild size="lg" className="rounded-full px-8"><Link href={start.href}>{start.label}<ArrowRight className="size-4" aria-hidden /></Link></Button></div>
      </section>
    </main>
  );
}

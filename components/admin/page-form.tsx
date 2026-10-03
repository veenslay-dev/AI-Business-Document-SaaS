"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { resetPageAction, savePageAction } from "@/lib/actions/admin-pages";

type Def = { path: string; name: string; title: string; absoluteTitle: boolean; description: string; heading: string; intro: string; content: boolean; noindex: boolean };
type Values = { seoTitle: string; seoDescription: string; canonical: string; ogImage: string; robots: string; heading: string; intro: string; extraMd: string; schemaJson: string };

const count = (n: number, soft: number) => `${n} of ${soft} recommended characters${n > soft ? ", a little long" : ""}.`;

export function PageForm({ def, initial, indexable, customised, siteBase, generatedSchema }: { def: Def; initial: Values; indexable: boolean; customised: boolean; siteBase: string; generatedSchema: string }) {
  const router = useRouter();
  const [v, setV] = useState<Values>(initial);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((s) => ({ ...s, [k]: val }));

  const shownTitle = v.seoTitle.trim() || (def.absoluteTitle ? def.title : `${def.title} | PrioDraft`);
  const shownDesc = v.seoDescription.trim() || def.description;
  const shownUrl = (v.canonical.trim() || def.path).startsWith("http") ? v.canonical.trim() : `${siteBase}${v.canonical.trim() || def.path}`;
  const willIndex = v.robots === "default" ? !def.noindex : v.robots === "index";

  function save(e: React.FormEvent) {
    e.preventDefault(); setError(null); setFields({});
    start(async () => {
      try {
        const res = await savePageAction({ path: def.path, ...v, robots: v.robots as "default" | "index" | "noindex" });
        if (res.ok) { toast.success(res.message ?? "Saved."); router.refresh(); } else { setError(res.error); setFields(res.fieldErrors ?? {}); }
      } catch { setError("We couldn't reach the server."); }
    });
  }
  function reset() {
    start(async () => {
      const res = await resetPageAction(def.path);
      if (res.ok) { toast.success(res.message ?? "Reset."); setV({ seoTitle: "", seoDescription: "", canonical: "", ogImage: "", robots: "default", heading: "", intro: "", extraMd: "", schemaJson: "" }); router.refresh(); }
      else setError(res.error);
    });
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {error && <FormMessage kind="error">{error}</FormMessage>}

      <section className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-soft">
        <h3 className="font-bold">Search appearance</h3>
        <div className="rounded-xl border border-line bg-white p-4" aria-label="Search result preview">
          <p className="truncate text-xs text-[#4d5156]">{shownUrl}</p>
          <p className="truncate text-lg text-[#1a0dab]">{shownTitle}</p>
          <p className="line-clamp-2 text-sm text-[#4d5156]">{shownDesc}</p>
        </div>
        <Field label="Search title" htmlFor="p-title" error={fields.seoTitle} hint={`Leave empty to use "${def.title}". ${count(v.seoTitle.length, 60)}`}>
          <Input id="p-title" value={v.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} placeholder={def.title} />
        </Field>
        <Field label="Meta description" htmlFor="p-desc" error={fields.seoDescription} hint={`Leave empty to use the built-in text. ${count(v.seoDescription.length, 160)}`}>
          <Textarea id="p-desc" rows={3} value={v.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} placeholder={def.description} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Canonical address" htmlFor="p-canon" error={fields.canonical} hint={`Leave empty. The page then names itself (${def.path}) as its canonical. Only set this if another address is the main version.`}>
            <Input id="p-canon" value={v.canonical} onChange={(e) => set("canonical", e.target.value)} placeholder={def.path} />
          </Field>
          <Field label="Search engines" htmlFor="p-robots" hint={willIndex ? "This page can appear in search results." : "This page is hidden from search results."}>
            <Select id="p-robots" value={v.robots} onChange={(e) => set("robots", e.target.value)}>
              <option value="default">Default ({def.noindex ? "noindex" : "index"})</option><option value="index">Allow indexing</option><option value="noindex">Hide from search (noindex)</option>
            </Select>
          </Field>
        </div>
        <Field label="Social sharing image" htmlFor="p-og" error={fields.ogImage} hint="An https address or a path such as /og/pricing.png. 1200 by 630 pixels works best. Empty uses the site's default image.">
          <Input id="p-og" value={v.ogImage} onChange={(e) => set("ogImage", e.target.value)} placeholder="https://" />
        </Field>
      </section>

      {def.content ? (
        <section className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-soft">
          <h3 className="font-bold">Page content</h3>
          <p className="text-sm text-ink-soft">Change the main heading and the opening text of this page, and add your own content below the main sections. Leave a box empty to keep the built-in text.</p>
          <Field label="Main heading (H1)" htmlFor="p-h1" error={fields.heading}><Input id="p-h1" value={v.heading} onChange={(e) => set("heading", e.target.value)} placeholder={def.heading} /></Field>
          <Field label="Intro text" htmlFor="p-intro" error={fields.intro}><Textarea id="p-intro" rows={3} value={v.intro} onChange={(e) => set("intro", e.target.value)} placeholder={def.intro || "Built-in introduction"} /></Field>
          <Field label="Extra content" htmlFor="p-extra" error={fields.extraMd} hint="Simple formatting: ## Heading, ### Smaller heading, - bullet, 1. numbered, **bold**, [link text](/contact). Shown below the page's main content.">
            <Textarea id="p-extra" rows={9} value={v.extraMd} onChange={(e) => set("extraMd", e.target.value)} className="font-mono text-[13px]" />
          </Field>
        </section>
      ) : <p className="rounded-2xl border border-line bg-surface p-5 text-sm text-ink-soft shadow-soft">This page is a sign-in form, so only its search settings and schema can be changed.</p>}

      <section className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-soft">
        <h3 className="font-bold">Structured data (schema markup)</h3>
        <p className="text-sm text-ink-soft">The page already includes schema markup built from its real content and prices, and it updates when you change them. Add more here only if you need it, for example an Event or a HowTo. Paste a JSON object, a list of objects, or an object with a @graph.</p>
        <Field label="Extra schema (JSON-LD)" htmlFor="p-schema" error={fields.schemaJson}>
          <Textarea id="p-schema" rows={8} value={v.schemaJson} onChange={(e) => set("schemaJson", e.target.value)} className="font-mono text-[13px]" placeholder={'{ "@type": "Event", "name": "..." }'} />
        </Field>
        <details className="rounded-xl border border-line p-4">
          <summary className="cursor-pointer text-sm font-semibold">See the schema this page outputs now</summary>
          <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-black/5 p-3 text-xs leading-5">{generatedSchema}</pre>
          <p className="mt-2 text-xs text-ink-faint">This is the saved version. Save your changes to see them here. Test any page with Google&apos;s Rich Results Test.</p>
        </details>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>Save page</Button>
        <a href={def.path} target="_blank" rel="noopener" className="text-sm font-semibold text-brand hover:underline">View page</a>
        {customised && <button type="button" onClick={reset} disabled={pending} className="ml-auto cursor-pointer text-sm font-medium text-signal hover:underline">Reset to built-in settings</button>}
      </div>
      <p className="text-xs text-ink-faint">{indexable ? "Currently indexable." : "Currently hidden from search."} The sitemap updates automatically.</p>
    </form>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DocumentRenderer } from "@/components/documents/document-renderer";
import { PreviewFrame } from "@/components/documents/editor/preview-frame";
import { inputCls, Labeled } from "@/components/documents/editor/ui";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { generateProposalAction } from "@/lib/actions/ai";
import { createProposalAction } from "@/lib/actions/documents";
import type { ProposalAi } from "@/lib/ai/schemas";
import type { BrandContext } from "@/lib/documents/branding";
import { buildProposalContent } from "@/lib/documents/builders";
import { CURRENCIES, type Currency } from "@/lib/documents/content";
import type { TemplateConfig } from "@/lib/documents/templates";
import { cn } from "@/lib/utils";

type ClientOpt = { id: string; name: string; contact: string; email: string; phone: string; address: string };
type Pkg = { id: string; name: string; price: number; description: string; features: string[] };
type Tpl = { value: string; label: string; config: TemplateConfig };
const STEPS = ["Client", "Project", "AI draft", "Edit", "Preview", "Create"] as const;
const lines = (s: string) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

export function ProposalWizard({ clients, packages, templates, brand, presetClient, aiConfigured, servicesFromProfile }: {
  clients: ClientOpt[]; packages: Pkg[]; templates: Tpl[]; brand: BrandContext; presetClient: string; aiConfigured: boolean; servicesFromProfile: string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [clientId, setClientId] = useState(clients.some((c) => c.id === presetClient) ? presetClient : "");
  const [f, setF] = useState({ title: "", description: "", goals: "", requirements: "", timeline: "", budget: "", notes: "", currency: "INR" as Currency, audience: "global" as "global" | "us" | "india" });
  const [services, setServices] = useState<string[]>([]);
  const [pkgIds, setPkgIds] = useState<string[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProposalAi | null>(null);
  const [aiUsed, setAiUsed] = useState(false);
  const [templateValue, setTemplateValue] = useState(templates[0]?.value ?? "sys:proposal-modern");
  const [error, setError] = useState<string | null>(null);
  const [aiPending, startAi] = useTransition();
  const [saving, startSave] = useTransition();

  const client = clients.find((c) => c.id === clientId);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const pickedPackages = useMemo(() => packages.filter((p) => pkgIds.includes(p.id)), [packages, pkgIds]);

  function blankDraft(): ProposalAi {
    return {
      title: f.title, executive_summary: f.description || f.title, client_challenges: lines(f.requirements), objectives: lines(f.goals),
      strategy: [], deliverables: services, timeline: f.timeline ? [{ phase: "Project timeline", duration: f.timeline, description: "" }] : [],
      investment: { items: [], currency: f.currency, notes: f.budget ? `Indicative budget: ${f.budget}` : "" }, terms: "",
    };
  }

  function generate() {
    setError(null);
    startAi(async () => {
      try {
        const res = await generateProposalAction({ clientId, ...f, services });
        if (res.ok && res.data) { setDraft(res.data); setAiUsed(true); setStep(3); }
        else if (!res.ok) setError(res.error);
      } catch { setError("We couldn't reach the server. Check your connection and try again."); }
    });
  }

  function next() {
    setError(null);
    if (step === 0 && !clientId) return setError("Choose a client to continue.");
    if (step === 1 && f.title.trim().length < 3) return setError("Give the proposal a title.");
    if (step === 1 && !draft) { /* AI step decides */ }
    setStep((s) => s + 1);
  }

  const previewContent = useMemo(() => {
    if (!client || !draft) return null;
    return buildProposalContent({
      brand, client: { company: client.name, contact: client.contact, email: client.email, phone: client.phone, address: client.address },
      input: { title: f.title, description: f.description, goals: f.goals, requirements: f.requirements, services, timeline: f.timeline, budget: f.budget, notes: f.notes, currency: f.currency },
      ai: draft, date: new Date().toISOString().slice(0, 10),
      packages: pickedPackages.map((p) => ({ name: p.name, price: p.price, description: p.description, features: p.features, selected: p.id === selectedPkg })),
    });
  }, [brand, client, draft, f, services, pickedPackages, selectedPkg]);

  function create() {
    setError(null);
    startSave(async () => {
      try {
        const [kind, id] = templateValue.split(":");
        const res = await createProposalAction({
          clientId, ...f, services, templateKey: kind === "sys" ? id : "proposal-modern", templateId: kind === "custom" ? id : null,
          packageIds: pkgIds, selectedPackageId: selectedPkg, ai: draft,
        });
        if (res.ok && res.data) { toast.success("Proposal created."); router.push(res.data.href); }
        else if (!res.ok) setError(res.error);
      } catch { setError("We couldn't reach the server. Check your connection and try again."); }
    });
  }

  const tpl = templates.find((t) => t.value === templateValue) ?? templates[0];

  return (
    <div className="max-w-4xl">
      <ol className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className="flex items-center gap-2">
            <button type="button" disabled={i > step} onClick={() => setStep(i)} className={cn("flex items-center gap-1.5 disabled:cursor-default", i === step ? "font-medium" : "text-ink-faint")}>
              <span className={cn("grid size-6 place-items-center rounded-full border text-xs", i < step ? "border-brand bg-brand text-white" : i === step ? "border-brand text-brand" : "border-line-strong")}>{i < step ? <Check className="size-3.5" /> : i + 1}</span>
              <span className="hidden sm:inline">{s}</span></button>
            {i < STEPS.length - 1 && <span aria-hidden className="h-px w-4 bg-line-strong sm:w-8" />}
          </li>
        ))}
      </ol>
      {error && <div className="mb-5"><FormMessage kind="error">{error}</FormMessage></div>}

      {step === 0 && (
        <section className="max-w-lg space-y-4">
          <h2 className="font-serif text-2xl">Who is this for?</h2>
          {clients.length === 0 ? (
            <p className="text-sm text-ink-soft">You don't have any clients yet. <Link href="/clients/new" className="font-medium text-brand hover:underline">Add one first</Link>, then come back.</p>
          ) : (
            <Labeled label="Client"><select className={inputCls} value={clientId} onChange={(e) => setClientId(e.target.value)}><option value="">Choose a client</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Labeled>
          )}
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4">
          <h2 className="font-serif text-2xl">Project details</h2>
          <Labeled label="Proposal title"><input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="SEO growth plan for Nova Furniture" /></Labeled>
          <Labeled label="Project description"><textarea className={`${inputCls} min-h-24`} value={f.description} onChange={(e) => set("description", e.target.value)} /></Labeled>
          <div className="grid gap-4 sm:grid-cols-2">
            <Labeled label="Business goals (one per line)"><textarea className={`${inputCls} min-h-24`} value={f.goals} onChange={(e) => set("goals", e.target.value)} /></Labeled>
            <Labeled label="Client requirements (one per line)"><textarea className={`${inputCls} min-h-24`} value={f.requirements} onChange={(e) => set("requirements", e.target.value)} /></Labeled>
          </div>
          <fieldset>
            <legend className="mb-1 text-xs font-medium text-ink-soft">Services included</legend>
            {servicesFromProfile.length === 0 && <p className="text-sm text-ink-soft">Add your services in Settings, Company to pick them here. You can also type one below.</p>}
            <div className="flex flex-wrap gap-2">
              {[...new Set([...servicesFromProfile, ...services])].map((s) => {
                const on = services.includes(s);
                return <button key={s} type="button" aria-pressed={on} onClick={() => setServices((x) => (on ? x.filter((y) => y !== s) : [...x, s]))}
                  className={cn("rounded-full border px-3 py-1 text-sm", on ? "border-brand bg-brand text-white" : "border-line-strong bg-surface hover:bg-paper")}>{s}</button>;
              })}
            </div>
            <input className={`${inputCls} mt-2 max-w-sm`} placeholder="Add another service and press Enter" aria-label="Add a service"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = e.currentTarget.value.trim(); if (v && !services.includes(v)) setServices((x) => [...x, v]); e.currentTarget.value = ""; } }} />
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-3">
            <Labeled label="Timeline"><input className={inputCls} value={f.timeline} onChange={(e) => set("timeline", e.target.value)} placeholder="3 months" /></Labeled>
            <Labeled label="Budget"><input className={inputCls} value={f.budget} onChange={(e) => set("budget", e.target.value)} placeholder="85,000 per month" /></Labeled>
            <Labeled label="Currency"><select className={inputCls} value={f.currency} onChange={(e) => set("currency", e.target.value as Currency)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Labeled>
          </div>
          <Labeled label="Notes for the AI or for yourself"><textarea className={`${inputCls} min-h-16`} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Labeled>
          <fieldset>
            <legend className="mb-1 text-xs font-medium text-ink-soft">Pricing packages to show (optional)</legend>
            {packages.length === 0 ? <p className="text-sm text-ink-soft">No packages yet. Create Basic, Standard and Premium packages under <Link href="/templates?tab=packages" className="text-brand hover:underline">Templates, Packages</Link>.</p> : (
              <div className="space-y-1.5">{packages.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={pkgIds.includes(p.id)} onChange={(e) => { setPkgIds((x) => e.target.checked ? [...x, p.id].slice(0, 4) : x.filter((y) => y !== p.id)); if (!e.target.checked && selectedPkg === p.id) setSelectedPkg(null); }} />{p.name} ({p.price.toLocaleString()})</label>
                  {pkgIds.includes(p.id) && <label className="flex items-center gap-1.5 text-ink-soft"><input type="radio" name="sel" checked={selectedPkg === p.id} onChange={() => setSelectedPkg(p.id)} />Recommend this one</label>}
                </div>))}</div>)}
          </fieldset>
        </section>
      )}

      {step === 2 && (
        <section className="max-w-xl space-y-4">
          <h2 className="font-serif text-2xl">Draft with AI</h2>
          <p className="text-sm text-ink-soft">The AI uses your company profile, services and knowledge base, plus the details you just entered. It returns a structured draft you can edit section by section. Nothing is sent to your client.</p>
          {!aiConfigured && <FormMessage kind="info">AI isn't configured for this deployment. You can still write the proposal yourself.</FormMessage>}
          <Labeled label="Write for" className="max-w-xs"><select className={inputCls} value={f.audience} onChange={(e) => set("audience", e.target.value as typeof f.audience)}><option value="global">General</option><option value="us">US clients</option><option value="india">Indian clients</option></select></Labeled>
          <div className="flex flex-wrap gap-2">
            <Button onClick={generate} loading={aiPending} disabled={!aiConfigured}>{aiPending ? "Writing your proposal" : <><Sparkles className="size-4" aria-hidden />{draft && aiUsed ? "Regenerate with AI" : "Generate Proposal with AI"}</>}</Button>
            <Button variant="secondary" disabled={aiPending} onClick={() => { if (!draft || !aiUsed) setDraft(blankDraft()); setStep(3); }}>{draft ? "Continue to editing" : "Write it myself"}</Button>
          </div>
          {aiPending && <p className="flex items-center gap-2 text-sm text-ink-soft"><Loader2 className="size-4 animate-spin" aria-hidden />This usually takes 15 to 40 seconds.</p>}
          {draft && aiUsed && <p className="text-xs text-ink-faint">Regenerating replaces any edits you made to the draft.</p>}
        </section>
      )}

      {step === 3 && draft && <DraftEditor draft={draft} onChange={setDraft} currency={f.currency} />}

      {step === 4 && previewContent && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-serif text-2xl">Preview</h2>
            <select aria-label="Template" className="h-8 rounded-md border border-line-strong bg-surface px-2 text-sm" value={templateValue} onChange={(e) => setTemplateValue(e.target.value)}>{templates.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          <PreviewFrame><DocumentRenderer content={previewContent} brand={brand} template={tpl.config} meta={{ type: "proposal" }} /></PreviewFrame>
        </section>
      )}

      {step === 5 && (
        <section className="max-w-lg space-y-4">
          <h2 className="font-serif text-2xl">Create the proposal</h2>
          <p className="text-sm text-ink-soft">This saves a draft for {client?.name}. You can keep editing, add or reorder sections, download a PDF and share a link from the next screen.</p>
          <Button size="lg" loading={saving} onClick={create}>Save and continue</Button>
        </section>
      )}

      <div className="mt-8 flex gap-2">
        {step > 0 && step < 5 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}
        {step === 5 && <Button variant="ghost" onClick={() => setStep(4)}>Back</Button>}
        {(step === 0 || step === 1 || step === 3 || step === 4) && <Button onClick={() => (step === 3 && !draft ? undefined : next())}>Continue</Button>}
      </div>
    </div>
  );
}

function DraftEditor({ draft, onChange, currency }: { draft: ProposalAi; onChange: (d: ProposalAi) => void; currency: string }) {
  const set = (fn: (d: ProposalAi) => void) => { const c = structuredClone(draft); fn(c); onChange(c); };
  const list = (label: string, key: "client_challenges" | "objectives" | "deliverables") => (
    <Labeled label={`${label} (one per line)`}><textarea className={`${inputCls} min-h-24`} value={draft[key].join("\n")} onChange={(e) => set((d) => { d[key] = e.target.value.split("\n"); })} /></Labeled>
  );
  return (
    <section className="space-y-5">
      <h2 className="font-serif text-2xl">Edit the draft</h2>
      <Labeled label="Title"><input className={inputCls} value={draft.title} onChange={(e) => set((d) => { d.title = e.target.value; })} /></Labeled>
      <Labeled label="Executive summary"><textarea className={`${inputCls} min-h-28`} value={draft.executive_summary} onChange={(e) => set((d) => { d.executive_summary = e.target.value; })} /></Labeled>
      <div className="grid gap-4 sm:grid-cols-2">{list("Current challenges", "client_challenges")}{list("Objectives", "objectives")}</div>
      <div>
        <p className="mb-1 text-xs font-medium text-ink-soft">Proposed strategy</p>
        {draft.strategy.map((s, i) => (
          <div key={i} className="mb-2 rounded-md border border-line p-2.5">
            <div className="flex gap-2"><input className={inputCls} aria-label="Strategy title" value={s.title} onChange={(e) => set((d) => { d.strategy[i].title = e.target.value; })} />
              <button type="button" aria-label="Remove strategy item" onClick={() => set((d) => { d.strategy.splice(i, 1); })} className="grid size-8 place-items-center rounded hover:bg-black/5"><Trash2 className="size-3.5" /></button></div>
            <textarea className={`${inputCls} mt-2`} rows={3} aria-label="Strategy description" value={s.description} onChange={(e) => set((d) => { d.strategy[i].description = e.target.value; })} />
          </div>))}
        <button type="button" className="text-xs text-brand hover:underline" onClick={() => set((d) => { d.strategy.push({ title: "", description: "" }); })}>+ Add strategy item</button>
      </div>
      {list("Deliverables", "deliverables")}
      <div>
        <p className="mb-1 text-xs font-medium text-ink-soft">Timeline</p>
        {draft.timeline.map((t, i) => (
          <div key={i} className="mb-2 grid gap-2 sm:grid-cols-[1fr_140px_1.5fr_auto]">
            <input className={inputCls} aria-label="Phase" placeholder="Phase" value={t.phase} onChange={(e) => set((d) => { d.timeline[i].phase = e.target.value; })} />
            <input className={inputCls} aria-label="Duration" placeholder="Duration" value={t.duration} onChange={(e) => set((d) => { d.timeline[i].duration = e.target.value; })} />
            <input className={inputCls} aria-label="Description" placeholder="Description" value={t.description} onChange={(e) => set((d) => { d.timeline[i].description = e.target.value; })} />
            <button type="button" aria-label="Remove phase" onClick={() => set((d) => { d.timeline.splice(i, 1); })} className="grid size-8 place-items-center rounded hover:bg-black/5"><Trash2 className="size-3.5" /></button>
          </div>))}
        <button type="button" className="text-xs text-brand hover:underline" onClick={() => set((d) => { d.timeline.push({ phase: "", duration: "", description: "" }); })}>+ Add phase</button>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-ink-soft">Investment ({draft.investment.currency ?? currency})</p>
        {draft.investment.items.map((it, i) => (
          <div key={i} className="mb-2 grid gap-2 sm:grid-cols-[1fr_1fr_130px_auto]">
            <input className={inputCls} aria-label="Item" placeholder="Item" value={it.name} onChange={(e) => set((d) => { d.investment.items[i].name = e.target.value; })} />
            <input className={inputCls} aria-label="Description" placeholder="Description" value={it.description} onChange={(e) => set((d) => { d.investment.items[i].description = e.target.value; })} />
            <input className={inputCls} type="number" min={0} aria-label="Amount" value={it.amount} onChange={(e) => set((d) => { d.investment.items[i].amount = Number(e.target.value) || 0; })} />
            <button type="button" aria-label="Remove item" onClick={() => set((d) => { d.investment.items.splice(i, 1); })} className="grid size-8 place-items-center rounded hover:bg-black/5"><Trash2 className="size-3.5" /></button>
          </div>))}
        <button type="button" className="text-xs text-brand hover:underline" onClick={() => set((d) => { d.investment.items.push({ name: "", description: "", amount: 0 }); })}>+ Add item</button>
        <Labeled label="Investment note" className="mt-2"><input className={inputCls} value={draft.investment.notes} onChange={(e) => set((d) => { d.investment.notes = e.target.value; })} /></Labeled>
      </div>
      <Labeled label="Terms (leave empty to use your default terms)"><textarea className={`${inputCls} min-h-24`} value={draft.terms} onChange={(e) => set((d) => { d.terms = e.target.value; })} /></Labeled>
    </section>
  );
}

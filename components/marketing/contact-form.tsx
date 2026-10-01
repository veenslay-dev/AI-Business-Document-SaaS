"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { submitContactAction } from "@/lib/actions/contact";
import { CONTACT_PLANS, CONTACT_TOPICS } from "@/lib/validation/contact";

const TOPIC_LABEL: Record<(typeof CONTACT_TOPICS)[number], string> = { general: "A general question", upgrade: "Upgrade my plan", custom: "A custom plan", support: "Help with my account" };
const PLAN_LABEL: Record<(typeof CONTACT_PLANS)[number], string> = { professional: "Pro", agency: "Agency", custom: "Custom" };

export function ContactForm({ defaults }: { defaults: { name: string; email: string; topic: (typeof CONTACT_TOPICS)[number]; plan: (typeof CONTACT_PLANS)[number] | null; workspaceId: string | null; billing?: string } }) {
  const [v, setV] = useState({ name: defaults.name, email: defaults.email, company: "", phone: "", topic: defaults.topic, plan: defaults.plan, message: "", website: "" });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setFields({});
    start(async () => {
      try {
        const message = v.topic === "upgrade" && defaults.billing === "yearly" ? `${v.message}\n\n(Interested in yearly billing.)` : v.message;
        const res = await submitContactAction({ ...v, message, workspaceId: defaults.workspaceId });
        if (res.ok) setDone(res.message ?? "Thanks, we'll be in touch soon.");
        else { setError(res.error); setFields(res.fieldErrors ?? {}); }
      } catch { setError("We couldn't reach the server. Check your connection and try again."); }
    });
  }

  if (done) {
    return (
      <div role="status" className="rounded-2xl border border-line bg-surface p-8 text-center shadow-soft">
        <CheckCircle2 className="mx-auto size-10 text-brand" aria-hidden />
        <h2 className="mt-4 text-xl font-bold">Message sent</h2>
        <p className="mt-2 text-ink-soft">{done}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-soft sm:p-8" noValidate>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor="c-name" error={fields.name}><Input id="c-name" value={v.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" required /></Field>
        <Field label="Email" htmlFor="c-email" error={fields.email}><Input id="c-email" type="email" value={v.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" required /></Field>
        <Field label="Company (optional)" htmlFor="c-company"><Input id="c-company" value={v.company} onChange={(e) => set("company", e.target.value)} autoComplete="organization" /></Field>
        <Field label="Phone or WhatsApp (optional)" htmlFor="c-phone"><Input id="c-phone" value={v.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" /></Field>
        <Field label="What is this about?" htmlFor="c-topic">
          <Select id="c-topic" value={v.topic} onChange={(e) => set("topic", e.target.value as typeof v.topic)}>{CONTACT_TOPICS.map((t) => <option key={t} value={t}>{TOPIC_LABEL[t]}</option>)}</Select>
        </Field>
        {(v.topic === "upgrade" || v.topic === "custom") && (
          <Field label="Plan you're interested in" htmlFor="c-plan">
            <Select id="c-plan" value={v.plan ?? ""} onChange={(e) => set("plan", (e.target.value || null) as typeof v.plan)}>
              <option value="">Not sure yet</option>{CONTACT_PLANS.map((p) => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
            </Select>
          </Field>
        )}
      </div>
      <Field label="Message" htmlFor="c-message" error={fields.message} hint={v.topic === "custom" ? "Tell us roughly how many documents, AI actions and team members you need each month." : undefined}>
        <Textarea id="c-message" rows={6} value={v.message} onChange={(e) => set("message", e.target.value)} required />
      </Field>
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => set("website", e.target.value)} /></label>
      </div>
      <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto">Send message</Button>
    </form>
  );
}

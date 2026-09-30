"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { inputCls, Labeled } from "@/components/documents/editor/ui";
import { createInvoiceAction } from "@/lib/actions/documents";
import { CURRENCIES, type Currency } from "@/lib/documents/content";

export function InvoiceForm({ clients, templates, presetClient, defaultTaxLabel = "GST", defaultTaxRate = 18 }: {
  clients: { id: string; name: string }[]; templates: { value: string; label: string }[]; presetClient: string; defaultTaxLabel?: string; defaultTaxRate?: number;
}) {
  const router = useRouter();
  const [v, setV] = useState(() => ({
    clientId: clients.some((c) => c.id === presetClient) ? presetClient : "", title: "",
    issueDate: new Date().toISOString().slice(0, 10), dueDate: new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10),
    currency: "INR" as Currency, taxLabel: defaultTaxLabel, taxRate: defaultTaxRate, paymentDetails: "", notes: "",
    template: templates[0]?.value ?? "sys:invoice-executive",
  }));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));

  if (clients.length === 0) {
    return <p className="text-sm text-ink-soft">You don't have any clients yet. <Link href="/clients/new" className="font-medium text-brand hover:underline">Add one first</Link>, then create the invoice.</p>;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!v.clientId) return setError("Choose a client.");
    start(async () => {
      try {
        const [kind, id] = v.template.split(":");
        const res = await createInvoiceAction({ clientId: v.clientId, title: v.title, issueDate: v.issueDate, dueDate: v.dueDate, currency: v.currency, taxLabel: v.taxLabel, taxRate: v.taxRate, paymentDetails: v.paymentDetails, notes: v.notes, templateKey: kind === "sys" ? id : "invoice-executive", templateId: kind === "custom" ? id : null });
        if (res.ok && res.data) { toast.success("Invoice created. Add your line items."); router.push(res.data.href); }
        else if (!res.ok) setError(res.error);
      } catch { setError("We couldn't reach the server. Check your connection and try again."); }
    });
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5">
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <Labeled label="Client"><select className={inputCls} value={v.clientId} onChange={(e) => set("clientId", e.target.value)} required><option value="">Choose a client</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Labeled>
      <Labeled label="Title (optional)"><input className={inputCls} value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Invoice for March retainer" /></Labeled>
      <div className="grid gap-4 sm:grid-cols-3">
        <Labeled label="Issue date"><input type="date" className={inputCls} value={v.issueDate} onChange={(e) => set("issueDate", e.target.value)} required /></Labeled>
        <Labeled label="Due date"><input type="date" className={inputCls} value={v.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></Labeled>
        <Labeled label="Currency"><select className={inputCls} value={v.currency} onChange={(e) => set("currency", e.target.value as Currency)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Labeled>
        <Labeled label="Tax name"><input className={inputCls} value={v.taxLabel} onChange={(e) => set("taxLabel", e.target.value)} placeholder="GST, VAT, Sales tax" /></Labeled>
        <Labeled label="Default tax rate %"><input type="number" min={0} max={100} step="0.01" className={inputCls} value={v.taxRate} onChange={(e) => set("taxRate", Number(e.target.value) || 0)} /></Labeled>
        <Labeled label="Template"><select className={inputCls} value={v.template} onChange={(e) => set("template", e.target.value)}>{templates.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Labeled>
      </div>
      <Labeled label="Payment details"><textarea className={`${inputCls} min-h-24`} value={v.paymentDetails} onChange={(e) => set("paymentDetails", e.target.value)} placeholder={"Bank name, account number, IFSC or SWIFT, UPI ID"} /></Labeled>
      <Labeled label="Notes"><textarea className={`${inputCls} min-h-20`} value={v.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Anything the client should know" /></Labeled>
      <p className="text-xs text-ink-faint">Set the tax rate to 0 and no tax column is shown. Discount and tax columns only appear when at least one line uses them. Sections you leave empty are left out.</p>
      <Button type="submit" loading={pending}>Create invoice</Button>
    </form>
  );
}

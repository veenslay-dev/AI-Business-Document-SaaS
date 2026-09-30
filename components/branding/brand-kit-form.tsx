"use client";

import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { AssetUploader } from "./asset-uploader";
import { BrandPreview, type PreviewBrand } from "./brand-preview";
import { saveBrandKitAction } from "@/lib/actions/workspace";
import { BODY_FONTS, HEADING_FONTS } from "@/lib/documents/fonts";
import { contrastRatio, ensureReadableOnWhite } from "@/lib/documents/branding";
import { brandKitSchema, type BrandKitInput, type BrandKitOutput } from "@/lib/validation/brand";

export type BrandKitDefaults = BrandKitInput & { logoUrl: string | null; darkLogoUrl: string | null };
export type PreviewCompany = Pick<PreviewBrand, "companyName" | "tagline" | "email" | "phone" | "website">;

function ColorField({ id, label, value, onChange, error }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <Field label={label} htmlFor={id} error={error}>
      <div className="flex items-center gap-2">
        <input
          type="color" aria-label={`${label} picker`} value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)} className="h-9 w-11 cursor-pointer rounded-md border border-line-strong bg-white p-1"
        />
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="font-mono uppercase" maxLength={7} aria-invalid={!!error} />
      </div>
    </Field>
  );
}

/** A color that can be left on automatic (null), in which case it follows the primary color. */
function AutoColorField({ id, label, hint, value, fallback, onChange, disabled }: {
  id: string; label: string; hint: string; value: string | null | undefined; fallback: string; onChange: (v: string | null) => void; disabled?: boolean;
}) {
  const auto = !value;
  const shown = value ?? fallback;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={`${label} picker`} disabled={auto || disabled} value={/^#[0-9a-f]{6}$/i.test(shown) ? shown : "#000000"} onChange={(e) => onChange(e.target.value)} className="h-9 w-11 cursor-pointer rounded-md border border-line-strong bg-white p-1 disabled:cursor-not-allowed disabled:opacity-50" />
        <Input id={id} value={auto ? "" : value ?? ""} placeholder="Automatic" disabled={auto || disabled} onChange={(e) => onChange(e.target.value)} className="font-mono uppercase" maxLength={7} />
      </div>
      <label className="flex items-center gap-2 text-xs text-ink-soft"><input type="checkbox" checked={auto} disabled={disabled} onChange={(e) => onChange(e.target.checked ? null : fallback)} />Automatic</label>
      <p className="text-xs text-ink-faint">{hint}</p>
    </div>
  );
}

export function BrandKitForm({
  defaults, company, submitLabel = "Save brand kit", onSaved, readOnly = false,
}: { defaults: BrandKitDefaults; company: PreviewCompany; submitLabel?: string; onSaved?: () => void; readOnly?: boolean }) {
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [logoUrl, setLogoUrl] = useState(defaults.logoUrl);
  const [pending, start] = useTransition();
  const { register, control, handleSubmit, getValues, setError, formState: { errors } } =
    useForm<BrandKitInput, unknown, BrandKitOutput>({ resolver: zodResolver(brandKitSchema), defaultValues: defaults });
  const v = useWatch({ control }) as BrandKitInput;

  const onSubmit = handleSubmit(() => {
    setMessage(null);
    start(async () => {
      try {
        const res = await saveBrandKitAction(getValues());
        if (res.ok) { setMessage({ kind: "success", text: res.message ?? "Saved." }); onSaved?.(); return; }
        Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => setError(k as keyof BrandKitInput, { message: m }));
        setMessage({ kind: "error", text: res.error });
      } catch {
        setMessage({ kind: "error", text: "We couldn't reach the server. Check your connection and try again." });
      }
    });
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
      <form onSubmit={onSubmit} className="space-y-6" noValidate>
        {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}
        <fieldset disabled={readOnly || pending} className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <AssetUploader kind="logo" label="Logo" value={defaults.logoUrl} onUploaded={setLogoUrl} />
            <AssetUploader kind="dark_logo" label="Logo for dark backgrounds" value={defaults.darkLogoUrl} dark />
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {(["primaryColor", "secondaryColor", "accentColor"] as const).map((name) => (
              <Controller key={name} control={control} name={name} render={({ field }) => (
                <ColorField id={name} value={field.value} onChange={field.onChange} error={errors[name]?.message}
                  label={{ primaryColor: "Primary", secondaryColor: "Secondary", accentColor: "Accent" }[name]} />
              )} />
            ))}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller control={control} name="headerColor" render={({ field }) => (
              <AutoColorField id="headerColor" label="Header color" hint="Cover band, table headers and total bars. Automatic uses the primary color." value={field.value} fallback={v.primaryColor} onChange={field.onChange} />
            )} />
            <Controller control={control} name="headingColor" render={({ field }) => (
              <AutoColorField id="headingColor" label="Heading text color" hint="Titles on white pages. Automatic uses a readable shade of the primary color." value={field.value} fallback={ensureReadableOnWhite(v.primaryColor)} onChange={field.onChange} />
            )} />
          </div>
          {v.headingColor && contrastRatio(v.headingColor, "#ffffff") < 4.5 && (
            <p role="status" className="rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-warn">This heading color is hard to read on white paper. Documents will darken it automatically, or pick a darker one.</p>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Heading font" htmlFor="headingFont" error={errors.headingFont?.message}>
              <Select id="headingFont" {...register("headingFont")}>{HEADING_FONTS.map((f) => <option key={f}>{f}</option>)}</Select>
            </Field>
            <Field label="Body font" htmlFor="bodyFont" error={errors.bodyFont?.message}>
              <Select id="bodyFont" {...register("bodyFont")}>{BODY_FONTS.map((f) => <option key={f}>{f}</option>)}</Select>
            </Field>
          </div>
          <Field label="Document footer" htmlFor="defaultFooter" error={errors.defaultFooter?.message}
            hint="Leave empty to show your contact details instead.">
            <Input id="defaultFooter" placeholder="Acme Digital · hello@acme.example · +91 98765 43210" {...register("defaultFooter")} />
          </Field>
        </fieldset>
        {!readOnly && <Button type="submit" loading={pending}>{submitLabel}</Button>}
      </form>
      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-faint">Live preview</p>
        <BrandPreview brand={{
          ...company, primary: v.primaryColor, secondary: v.secondaryColor, accent: v.accentColor, header: v.headerColor, headingText: v.headingColor,
          headingFont: v.headingFont, bodyFont: v.bodyFont, logoUrl, footer: v.defaultFooter,
        }} />
      </div>
    </div>
  );
}

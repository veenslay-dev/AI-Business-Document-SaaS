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
          ...company, primary: v.primaryColor, secondary: v.secondaryColor, accent: v.accentColor,
          headingFont: v.headingFont, bodyFont: v.bodyFont, logoUrl, footer: v.defaultFooter,
        }} />
      </div>
    </div>
  );
}

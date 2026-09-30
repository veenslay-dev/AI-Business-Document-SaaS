"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { saveCompanyInfoAction } from "@/lib/actions/workspace";
import { companyInfoSchema, type CompanyInfoInput, type CompanyInfoOutput } from "@/lib/validation/company";

export type CompanyInfoDefaults = {
  companyName: string; tagline: string; website: string; email: string; phone: string;
  address: string; gstNumber: string; panNumber: string; description: string;
};

export function CompanyInfoForm({
  defaults, submitLabel = "Save changes", onSaved, readOnly = false,
}: { defaults: CompanyInfoDefaults; submitLabel?: string; onSaved?: (values: CompanyInfoInput) => void; readOnly?: boolean }) {
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const { register, handleSubmit, getValues, setError, formState: { errors } } =
    useForm<CompanyInfoInput, unknown, CompanyInfoOutput>({ resolver: zodResolver(companyInfoSchema), defaultValues: defaults });

  const onSubmit = handleSubmit(() => {
    setMessage(null);
    start(async () => {
      try {
        const res = await saveCompanyInfoAction(getValues());
        if (res.ok) { setMessage({ kind: "success", text: res.message ?? "Saved." }); onSaved?.(getValues()); return; }
        Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => setError(k as keyof CompanyInfoInput, { message: m }));
        setMessage({ kind: "error", text: res.error });
      } catch {
        setMessage({ kind: "error", text: "We couldn't reach the server. Check your connection and try again." });
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}
      <fieldset disabled={readOnly || pending} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Company name" htmlFor="companyName" error={errors.companyName?.message}>
            <Input id="companyName" aria-invalid={!!errors.companyName} {...register("companyName")} />
          </Field>
          <Field label="Tagline" htmlFor="tagline" error={errors.tagline?.message}>
            <Input id="tagline" placeholder="Search growth for local businesses" {...register("tagline")} />
          </Field>
          <Field label="Website" htmlFor="website" error={errors.website?.message}>
            <Input id="website" inputMode="url" placeholder="https://acme.example" aria-invalid={!!errors.website} {...register("website")} />
          </Field>
          <Field label="Business email" htmlFor="email" error={errors.email?.message} hint="Shown on documents you send.">
            <Input id="email" type="email" aria-invalid={!!errors.email} {...register("email")} />
          </Field>
          <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
            <Input id="phone" type="tel" {...register("phone")} />
          </Field>
          <Field label="GST number" htmlFor="gstNumber" error={errors.gstNumber?.message}>
            <Input id="gstNumber" {...register("gstNumber")} />
          </Field>
          <Field label="PAN" htmlFor="panNumber" error={errors.panNumber?.message}>
            <Input id="panNumber" {...register("panNumber")} />
          </Field>
        </div>
        <Field label="Address" htmlFor="address" error={errors.address?.message}>
          <Textarea id="address" rows={2} {...register("address")} />
        </Field>
        <Field label="About the company" htmlFor="description" error={errors.description?.message}
          hint="A few sentences. The AI uses this to write in your voice.">
          <Textarea id="description" rows={4} {...register("description")} />
        </Field>
      </fieldset>
      {!readOnly && <Button type="submit" loading={pending}>{submitLabel}</Button>}
    </form>
  );
}

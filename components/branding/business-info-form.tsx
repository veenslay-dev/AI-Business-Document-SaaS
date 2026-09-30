"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { AssetUploader } from "./asset-uploader";
import { saveBusinessInfoAction } from "@/lib/actions/workspace";
import { businessInfoSchema, type BusinessInfoInput, type BusinessInfoOutput } from "@/lib/validation/company";

export type BusinessInfoDefaults = {
  services: string; defaultTerms: string; authorizedName: string; authorizedDesignation: string; signatureUrl: string | null;
};

export function BusinessInfoForm({
  defaults, submitLabel = "Save changes", onSaved, readOnly = false,
}: { defaults: BusinessInfoDefaults; submitLabel?: string; onSaved?: () => void; readOnly?: boolean }) {
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<BusinessInfoInput, unknown, BusinessInfoOutput>({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: {
      services: defaults.services, defaultTerms: defaults.defaultTerms,
      authorizedName: defaults.authorizedName, authorizedDesignation: defaults.authorizedDesignation,
    },
  });

  const onSubmit = handleSubmit(() => {
    setMessage(null);
    start(async () => {
      try {
        const res = await saveBusinessInfoAction(getValues());
        if (res.ok) { setMessage({ kind: "success", text: res.message ?? "Saved." }); onSaved?.(); }
        else setMessage({ kind: "error", text: res.error });
      } catch {
        setMessage({ kind: "error", text: "We couldn't reach the server. Check your connection and try again." });
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}
      <fieldset disabled={readOnly || pending} className="space-y-5">
        <Field label="Services you offer" htmlFor="services" error={errors.services?.message}
          hint="One per line. The AI draws on this list when it writes proposals.">
          <Textarea id="services" rows={5} placeholder={"Technical SEO audits\nWebsite design and development\nMonthly SEO retainers"} {...register("services")} />
        </Field>
        <Field label="Default terms and conditions" htmlFor="defaultTerms" error={errors.defaultTerms?.message}
          hint="Added to new proposals and quotations. You can edit them per document.">
          <Textarea id="defaultTerms" rows={6} {...register("defaultTerms")} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Authorized person" htmlFor="authorizedName" error={errors.authorizedName?.message}>
            <Input id="authorizedName" {...register("authorizedName")} />
          </Field>
          <Field label="Designation" htmlFor="authorizedDesignation" error={errors.authorizedDesignation?.message}>
            <Input id="authorizedDesignation" placeholder="Founder" {...register("authorizedDesignation")} />
          </Field>
        </div>
        <AssetUploader kind="signature" label="Signature" value={defaults.signatureUrl} hint="A transparent PNG works best." />
      </fieldset>
      {!readOnly && <Button type="submit" loading={pending}>{submitLabel}</Button>}
    </form>
  );
}

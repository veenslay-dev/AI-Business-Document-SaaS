"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { createClientAction, updateClientAction } from "@/lib/actions/clients";
import { clientSchema, type ClientInput, type ClientOutput } from "@/lib/validation/crm";

export function ClientForm({ clientId, defaults }: { clientId?: string; defaults?: ClientInput }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { register, handleSubmit, getValues, setError: setFieldError, formState: { errors } } = useForm<ClientInput, unknown, ClientOutput>({
    resolver: zodResolver(clientSchema),
    defaultValues: defaults ?? { companyName: "", contactName: "", email: "", phone: "", website: "", industry: "", address: "", gstNumber: "", notes: "" },
  });

  const onSubmit = handleSubmit(() => {
    setError(null);
    start(async () => {
      try {
        const values = getValues();
        const res = clientId ? await updateClientAction(clientId, values) : await createClientAction(values);
        if (res.ok) {
          toast.success(res.message ?? "Saved.");
          router.push(clientId ? `/clients/${clientId}` : `/clients/${(res as { data?: { id: string } }).data?.id ?? ""}`);
          router.refresh();
          return;
        }
        Object.entries(res.fieldErrors ?? {}).forEach(([k, m]) => setFieldError(k as keyof ClientInput, { message: m }));
        setError(res.error);
      } catch { setError("We couldn't reach the server. Check your connection and try again."); }
    });
  });

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5" noValidate>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Company name" htmlFor="companyName" error={errors.companyName?.message} className="sm:col-span-2">
          <Input id="companyName" aria-invalid={!!errors.companyName} {...register("companyName")} />
        </Field>
        <Field label="Contact person" htmlFor="contactName" error={errors.contactName?.message}><Input id="contactName" {...register("contactName")} /></Field>
        <Field label="Industry" htmlFor="industry" error={errors.industry?.message}><Input id="industry" placeholder="Furniture, Dental, Real estate" {...register("industry")} /></Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}><Input id="email" type="email" aria-invalid={!!errors.email} {...register("email")} /></Field>
        <Field label="Phone" htmlFor="phone" error={errors.phone?.message}><Input id="phone" type="tel" {...register("phone")} /></Field>
        <Field label="Website" htmlFor="website" error={errors.website?.message}><Input id="website" inputMode="url" placeholder="https://" aria-invalid={!!errors.website} {...register("website")} /></Field>
        <Field label="GST number" htmlFor="gstNumber" error={errors.gstNumber?.message}><Input id="gstNumber" {...register("gstNumber")} /></Field>
      </div>
      <Field label="Address" htmlFor="address" error={errors.address?.message}><Textarea id="address" rows={2} {...register("address")} /></Field>
      <Field label="Notes" htmlFor="notes" error={errors.notes?.message} hint="Private. Never shown on documents."><Textarea id="notes" rows={3} {...register("notes")} /></Field>
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>{clientId ? "Save client" : "Add client"}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>Cancel</Button>
      </div>
    </form>
  );
}

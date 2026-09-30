"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { signUpAction } from "@/lib/actions/auth";
import { signupSchema, type SignupInput } from "@/lib/validation/auth";

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    start(async () => {
      try {
        const res = await signUpAction(values);
        if (res && !res.ok) setError(res.error);
        else if (res?.ok && res.data?.needsConfirmation) setSentTo(values.email);
      } catch (e) {
        if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
        setError("We couldn't reach the server. Check your connection and try again.");
      }
    });
  });

  if (sentTo) {
    return (
      <div className="space-y-3">
        <MailCheck className="size-8 text-brand" aria-hidden />
        <h1 className="font-serif text-3xl">Check your inbox</h1>
        <p className="text-sm leading-relaxed text-ink-soft">
          We sent a confirmation link to <strong className="text-ink">{sentTo}</strong>. Open it to
          finish setting up your workspace.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <h1 className="font-serif text-3xl">Start your workspace</h1>
        <p className="mt-1 text-sm text-ink-soft">Free plan. No card needed.</p>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <Field label="Your name" htmlFor="fullName" error={errors.fullName?.message}>
        <Input id="fullName" autoComplete="name" aria-invalid={!!errors.fullName} {...register("fullName")} />
      </Field>
      <Field label="Company name" htmlFor="companyName" error={errors.companyName?.message}>
        <Input id="companyName" autoComplete="organization" aria-invalid={!!errors.companyName} {...register("companyName")} />
      </Field>
      <Field label="Work email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message} hint="At least 8 characters.">
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
      </Field>
      <Button type="submit" className="w-full" loading={pending}>Create account</Button>
      <p className="text-center text-sm text-ink-soft">
        Already have an account? <Link href="/login" className="font-medium text-brand hover:underline">Sign in</Link>
      </p>
    </form>
  );
}

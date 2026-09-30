"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { forgotPasswordAction, resetPasswordAction } from "@/lib/actions/auth";
import {
  forgotPasswordSchema, resetPasswordSchema,
  type ForgotPasswordInput, type ResetPasswordInput,
} from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    start(async () => {
      try {
        const res = await forgotPasswordAction(values);
        if (res.ok) setDone(res.message ?? "Check your email.");
        else setError(res.error);
      } catch {
        setError("We couldn’t reach the server. Check your connection and try again.");
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <h1 className="font-serif text-3xl">Reset your password</h1>
        <p className="mt-1 text-sm text-ink-soft">We’ll email you a link to choose a new one.</p>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {done && <FormMessage kind="success">{done}</FormMessage>}
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <Button type="submit" className="w-full" loading={pending}>Send reset link</Button>
      <p className="text-center text-sm"><Link href="/login" className="text-ink-soft hover:text-ink">Back to sign in</Link></p>
    </form>
  );
}

export function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    start(async () => {
      try {
        const res = await resetPasswordAction(values);
        if (res && !res.ok) setError(res.error);
      } catch (e) {
        if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
        setError("We couldn’t reach the server. Check your connection and try again.");
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <h1 className="font-serif text-3xl">Choose a new password</h1>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <Field label="New password" htmlFor="password" error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
      </Field>
      <Field label="Confirm password" htmlFor="confirm" error={errors.confirm?.message}>
        <Input id="confirm" type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} {...register("confirm")} />
      </Field>
      <Button type="submit" className="w-full" loading={pending}>Update password</Button>
    </form>
  );
}

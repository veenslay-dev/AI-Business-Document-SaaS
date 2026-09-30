"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { signInAction } from "@/lib/actions/auth";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((values) => {
    setError(null);
    start(async () => {
      try {
        const res = await signInAction(values, next);
        if (res && !res.ok) setError(res.error);
      } catch (e) {
        // redirect() surfaces as a control-flow throw; anything else is a network failure
        if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
        setError("We couldn't reach the server. Check your connection and try again.");
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <h1 className="font-serif text-3xl">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-soft">Sign in to your workspace.</p>
      </div>
      {notice && <FormMessage kind="info">{notice}</FormMessage>}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register("password")} />
      </Field>
      <div className="text-right text-sm">
        <Link href="/forgot-password" className="text-ink-soft hover:text-ink">Forgot password?</Link>
      </div>
      <Button type="submit" className="w-full" loading={pending}>Sign in</Button>
      <p className="text-center text-sm text-ink-soft">
        New here? <Link href="/signup" className="font-medium text-brand hover:underline">Create an account</Link>
      </p>
    </form>
  );
}

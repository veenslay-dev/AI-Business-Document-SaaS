"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { changePasswordAction } from "@/lib/actions/auth";
import { updateProfileAction } from "@/lib/actions/workspace";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validation/auth";

type Msg = { kind: "error" | "success"; text: string } | null;

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<{ fullName: string }>({ defaultValues: { fullName } });

  const onSubmit = handleSubmit((v) => {
    setMsg(null);
    start(async () => {
      try {
        const res = await updateProfileAction(v);
        setMsg(res.ok ? { kind: "success", text: res.message ?? "Saved." } : { kind: "error", text: res.error });
      } catch { setMsg({ kind: "error", text: "We couldn't reach the server. Try again." }); }
    });
  });

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-5" noValidate>
      {msg && <FormMessage kind={msg.kind}>{msg.text}</FormMessage>}
      <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
        <Input id="fullName" {...register("fullName")} />
      </Field>
      <Field label="Email" htmlFor="email" hint="Your sign-in email. Contact support to change it.">
        <Input id="email" value={email} readOnly disabled />
      </Field>
      <Button type="submit" loading={pending}>Save profile</Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = handleSubmit((v) => {
    setMsg(null);
    start(async () => {
      try {
        const res = await changePasswordAction(v);
        if (res.ok) { reset(); setMsg({ kind: "success", text: res.message ?? "Password updated." }); }
        else setMsg({ kind: "error", text: res.error });
      } catch { setMsg({ kind: "error", text: "We couldn't reach the server. Try again." }); }
    });
  });

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-5" noValidate>
      {msg && <FormMessage kind={msg.kind}>{msg.text}</FormMessage>}
      <Field label="New password" htmlFor="password" error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm" error={errors.confirm?.message}>
        <Input id="confirm" type="password" autoComplete="new-password" {...register("confirm")} />
      </Field>
      <Button type="submit" loading={pending}>Update password</Button>
    </form>
  );
}

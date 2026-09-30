"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/utils";
import {
  forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema,
  type ForgotPasswordInput, type LoginInput, type ResetPasswordInput, type SignupInput,
} from "@/lib/validation/auth";
import { fail, fromZod, GENERIC_ERROR, type ActionResult } from "./result";

const NOT_CONFIGURED = "The app isn't connected to Supabase yet. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the app.";
const UNREACHABLE = "The app couldn't reach Supabase. Check that the Project URL in .env.local is exactly right (https://<project>.supabase.co) and that the project is running.";
const supabaseConfigured = () => !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Network failures talking to Supabase surface as thrown errors. Log the cause on the server and return a useful message. */
function isNetworkFailure(e: unknown): boolean {
  if (e && typeof e === "object" && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) return false;
  console.error("[auth] request to Supabase failed:", e instanceof Error ? `${e.name}: ${e.message}` : e);
  return true;
}

/** Only allow same-site relative redirects. */
function safeNext(next: string | undefined, fallback: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export async function signInAction(input: LoginInput, next?: string): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  if (!supabaseConfigured()) return fail(NOT_CONFIGURED);
  const supabase = await createClient();
  let signInError: { message: string } | null;
  try { signInError = (await supabase.auth.signInWithPassword(parsed.data)).error; } catch (e) { isNetworkFailure(e); return fail(UNREACHABLE); }
  const error = signInError;
  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return fail("Confirm your email first. We sent you a link when you signed up.");
    }
    return fail("That email and password don't match.");
  }
  redirect(safeNext(next, "/dashboard"));
}

export async function signUpAction(input: SignupInput, next?: string): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const { email, password, fullName, companyName } = parsed.data;

  if (!supabaseConfigured()) return fail(NOT_CONFIGURED);
  const supabase = await createClient();
  let result;
  try { result = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, company_name: companyName },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(safeNext(next, "/onboarding"))}`,
    },
  }); } catch (e) { isNetworkFailure(e); return fail(UNREACHABLE); }
  const { data, error } = result;
  if (error) {
    if (/registered|exists/i.test(error.message)) return fail("An account with this email already exists. Try signing in.");
    if (/password/i.test(error.message)) return fail(error.message);
    return fail(GENERIC_ERROR);
  }
  // Supabase returns an empty identities list for an already-registered address.
  if (data.user && data.user.identities?.length === 0) {
    return fail("An account with this email already exists. Try signing in.");
  }
  if (data.session) redirect(safeNext(next, "/onboarding"));
  return { ok: true, data: { needsConfirmation: true } };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPasswordAction(input: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const supabase = await createClient();
  // Always report success so the form can't be used to discover which emails have accounts.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });
  return { ok: true, message: "If an account exists for that email, a reset link is on its way." };
}

export async function resetPasswordAction(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("This reset link has expired. Request a new one.");
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(error.message.includes("different") ? "Choose a password you haven't used before." : GENERIC_ERROR);
  redirect("/dashboard");
}

export async function changePasswordAction(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return fail("Your session has expired. Please sign in again.");
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(error.message.includes("different") ? "Choose a password you haven't used before." : GENERIC_ERROR);
  return { ok: true, message: "Password updated." };
}

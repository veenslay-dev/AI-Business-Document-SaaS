import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];

/**
 * Completes the links in Supabase's emails (confirm your email, reset your password) from a token hash.
 * Unlike the code flow in /auth/callback, this does not depend on the browser that asked for the email, so a reset
 * link requested on a laptop still works when it is opened on a phone.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const fallback = type === "recovery" ? "/reset-password" : type === "signup" || type === "email" ? "/onboarding" : "/dashboard";
  const next = safeNext(searchParams.get("next"), fallback);

  if (tokenHash && type && TYPES.includes(type)) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (!error) return NextResponse.redirect(`${origin}${next}`);
    } catch (e) {
      console.error("[auth] confirming an email link failed:", e instanceof Error ? e.message : "unknown");
    }
  }
  return NextResponse.redirect(`${origin}/login?error=link_expired`);
}

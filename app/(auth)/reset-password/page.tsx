import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/password-forms";
import { getUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default async function Page() {
  const user = await getUser();
  if (!user) {
    return (
      <div className="space-y-3">
        <h1 className="font-serif text-3xl">Link expired</h1>
        <p className="text-sm text-ink-soft">This reset link is no longer valid.</p>
        <Link href="/forgot-password" className="text-sm font-medium text-brand hover:underline">Request a new link</Link>
      </div>
    );
  }
  return <ResetPasswordForm />;
}

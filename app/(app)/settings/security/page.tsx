import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/dashboard/simple-forms";

export const metadata: Metadata = { title: "Security settings" };

export default function SecurityPage() {
  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold">Password</h2>
      <p className="mb-5 text-sm text-ink-soft">Choose a password you don’t use anywhere else.</p>
      <ChangePasswordForm />
    </section>
  );
}

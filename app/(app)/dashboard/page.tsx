import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireWorkspace } from "@/lib/auth/session";
import { getWorkspaceBranding } from "@/lib/db/workspace";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { membership } = await requireWorkspace();
  const data = await getWorkspaceBranding(membership.workspaceId);
  const c = data?.company;
  const b = data?.brand;

  const steps = [
    { done: !!c?.company_name && !!c?.email, label: "Add your business email and phone", href: "/settings/company" },
    { done: !!b?.logo_url, label: "Upload your logo", href: "/brand-kit" },
    { done: Array.isArray(c?.services) && (c?.services as unknown[]).length > 0, label: "List the services you offer", href: "/settings/company" },
    { done: !!c?.default_terms, label: "Write your default terms", href: "/settings/company" },
    { done: !!c?.signature_url, label: "Add a signature for documents", href: "/settings/company" },
  ];
  const remaining = steps.filter((s) => !s.done).length;

  return (
    <>
      <PageHeader title={`Welcome, ${membership.name}`} description="Your workspace is set up. Clients, proposals and quotations arrive in the next release phases." />
      <section className="max-w-2xl rounded-lg border border-line bg-surface shadow-soft">
        <div className="border-b border-line px-5 py-4">
          <h2 className="font-semibold">{remaining === 0 ? "Your profile is complete" : "Finish your profile"}</h2>
          <p className="mt-0.5 text-sm text-ink-soft">
            {remaining === 0 ? "Everything a document needs is in place." : `${remaining} of ${steps.length} left. Documents look better with all of it filled in.`}
          </p>
        </div>
        <ul className="divide-y divide-line">
          {steps.map((s) => (
            <li key={s.label}>
              <Link href={s.href} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-paper">
                {s.done ? <CheckCircle2 className="size-4 text-ok" aria-hidden /> : <Circle className="size-4 text-ink-faint" aria-hidden />}
                <span className={s.done ? "text-ink-faint line-through" : ""}>{s.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

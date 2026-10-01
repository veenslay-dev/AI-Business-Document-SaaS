import type { Metadata } from "next";
import { Clock, Mail, MessageSquareText } from "lucide-react";
import { ContactForm } from "@/components/marketing/contact-form";
import { PRODUCT_NAME } from "@/components/ui/logo";
import { getUser } from "@/lib/auth/session";
import { CONTACT_PLANS, CONTACT_TOPICS } from "@/lib/validation/contact";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${PRODUCT_NAME} for help, plan upgrades or a custom plan.`,
  alternates: { canonical: "/contact" },
};
export const dynamic = "force-dynamic";

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string; plan?: string; workspace?: string; billing?: string }> }) {
  const sp = await searchParams;
  const user = await getUser();
  const topic = (CONTACT_TOPICS as readonly string[]).includes(sp.topic ?? "") ? (sp.topic as (typeof CONTACT_TOPICS)[number]) : "general";
  const plan = (CONTACT_PLANS as readonly string[]).includes(sp.plan ?? "") ? (sp.plan as (typeof CONTACT_PLANS)[number]) : topic === "custom" ? "custom" : null;
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const heading = topic === "upgrade" ? "Upgrade your plan" : topic === "custom" ? "Ask for a custom plan" : "Get in touch";
  const sub = topic === "upgrade" ? "Tell us which plan you want. We'll reply with the payment details and switch it on for your workspace."
    : topic === "custom" ? "Need more AI actions, documents or team members than the standard plans? Tell us what you need and we'll put together a plan."
    : "Questions, feedback or a problem with your account? Send us a message and we'll reply by email.";

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        <h1 className="text-4xl font-extrabold">{heading}</h1>
        <p className="mb-8 mt-3 max-w-xl text-ink-soft">{sub}</p>
        <ContactForm defaults={{
          name: (user?.user_metadata?.full_name as string | undefined) ?? "", email: user?.email ?? "", topic, plan,
          workspaceId: user && sp.workspace ? sp.workspace : null, billing: sp.billing,
        }} />
      </div>
      <aside className="h-fit space-y-5 rounded-2xl bg-brand-soft/60 p-6 text-sm">
        <h2 className="text-lg font-bold">What happens next</h2>
        <ul className="space-y-4 text-ink-soft">
          <li className="flex gap-3"><MessageSquareText className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden /><span>Your message goes straight to our team inbox.</span></li>
          <li className="flex gap-3"><Clock className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden /><span>We reply by email, usually within one working day.</span></li>
          <li className="flex gap-3"><Mail className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden /><span>{email ? <>Prefer email? Write to <a className="font-semibold text-brand hover:underline" href={`mailto:${email}`}>{email}</a>.</> : "We only use your details to answer you."}</span></li>
        </ul>
      </aside>
    </main>
  );
}

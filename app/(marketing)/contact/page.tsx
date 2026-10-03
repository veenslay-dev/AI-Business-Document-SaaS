import Link from "next/link";
import { Clock, Mail, MessageSquareText } from "lucide-react";
import { ContactForm } from "@/components/marketing/contact-form";
import { PageSchema } from "@/components/seo/page-schema";
import { FaqSection } from "@/components/marketing/faq-section";
import { PAGE_FAQ } from "@/lib/content/faq";
import { getUser } from "@/lib/auth/session";
import { Markdown } from "@/lib/seo/markdown";
import { getPageContent, pageMetadata } from "@/lib/seo/pages";
import { CONTACT_PLANS, CONTACT_TOPICS } from "@/lib/validation/contact";

export const generateMetadata = () => pageMetadata("/contact");
export const dynamic = "force-dynamic";

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string; plan?: string; workspace?: string; billing?: string }> }) {
  const sp = await searchParams;
  const user = await getUser();
  const topic = (CONTACT_TOPICS as readonly string[]).includes(sp.topic ?? "") ? (sp.topic as (typeof CONTACT_TOPICS)[number]) : "general";
  const plan = (CONTACT_PLANS as readonly string[]).includes(sp.plan ?? "") ? (sp.plan as (typeof CONTACT_PLANS)[number]) : topic === "custom" ? "custom" : null;
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  const c = await getPageContent("/contact");
  const heading = topic === "upgrade" ? "Upgrade your plan" : topic === "custom" ? "Ask for a custom plan" : c.heading ?? "Get in touch";
  const sub = topic === "upgrade" ? "Tell us which plan you want and we'll set it up. You can also pay online yourself from Settings, then Subscription, and the plan switches on as soon as the payment clears."
    : topic === "custom" ? "Need more AI actions, documents or team members than the standard plans? Tell us what you need and we'll put together a plan."
    : c.intro ?? "Questions, feedback or a problem with your account? Send us a message and we'll reply by email.";

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_340px]">
      <PageSchema path="/contact" />
      <div>
        <h1 className="text-4xl font-extrabold">{heading}</h1>
        <p className="mb-8 mt-3 max-w-xl text-ink-soft">{sub}</p>
        {c.extraMd && <div className="mb-8 max-w-xl text-sm text-ink-soft"><Markdown md={c.extraMd} /></div>}
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
      <p className="text-xs text-ink-faint">See also our <Link href="/terms" className="text-brand hover:underline">Terms of Service</Link>, <Link href="/privacy" className="text-brand hover:underline">Privacy Policy</Link> and <Link href="/refund-policy" className="text-brand hover:underline">Refund Policy</Link>.</p>
      </aside>
      <div className="lg:col-span-2"><FaqSection items={PAGE_FAQ["/contact"]} title="Before you write" className="!px-0" /></div>
    </main>
  );
}

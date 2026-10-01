import type { Metadata } from "next";
import Link from "next/link";
import { FileCheck2, Palette, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRODUCT_NAME } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "About",
  description: `${PRODUCT_NAME} helps agencies and freelancers send proposals, quotations, invoices and audits that look like their own company made them.`,
  alternates: { canonical: "/about" },
};

const VALUES = [
  { icon: Palette, title: "Your brand, every time", body: "Set your logo, colors, fonts and terms once. Every document picks them up, so nothing goes out looking half finished." },
  { icon: Sparkles, title: "AI that stays in its lane", body: "The assistant drafts from the facts you give it and never sends anything on its own. You read and edit everything before a client sees it." },
  { icon: FileCheck2, title: "Documents that close work", body: "Share a private link, see when it's opened, and let clients accept, decline or ask for changes without an email chain." },
  { icon: ShieldCheck, title: "Your data stays yours", body: "Each company's records are separated at the database level. Shared documents are only reachable through their private link." },
];

export default function AboutPage() {
  return (
    <main>
      <section className="mx-auto max-w-4xl px-5 pb-12 pt-14 text-center">
        <p className="mb-4 inline-block rounded-full bg-brand-soft px-3.5 py-1.5 text-sm font-semibold text-brand">About {PRODUCT_NAME}</p>
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">Professional client documents, <span className="text-brand">without the busywork</span></h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-soft">{PRODUCT_NAME} is for agencies, consultants and freelancers who write proposals, quotations, invoices and audit reports and want each one to look like it came from a bigger company.</p>
      </section>

      <section className="mx-auto max-w-4xl space-y-5 px-5 pb-14 text-ink-soft">
        <h2 className="text-2xl font-extrabold text-ink">Why it exists</h2>
        <p>Most small businesses write client documents in a word processor, copy the last one, and change the names. Logos drift, prices are retyped, terms get lost and nobody knows whether the client even opened the file.</p>
        <p>{PRODUCT_NAME} puts that work in one place. You describe the job, review a draft in your own branding, send a link, and see what happens next. It handles scope of work quotations, invoices, SEO audits and social media audits as well as proposals, because those are the documents agencies actually send.</p>
        <p>We are honest about the limits too. The AI can be wrong, so every draft is editable. A client's online acceptance is a record of who agreed and when, which may not be enough for every contract, so check with a lawyer for anything high stakes.</p>
      </section>

      <section className="bg-brand-soft/50">
        <div className="mx-auto grid max-w-6xl gap-5 px-5 py-16 sm:grid-cols-2">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl bg-surface p-6 shadow-soft">
              <span aria-hidden className="mb-4 grid size-11 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="size-5" /></span>
              <h3 className="font-bold">{title}</h3><p className="mt-1.5 text-sm text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h2 className="text-2xl font-extrabold">Want to try it?</h2>
        <p className="mt-2 text-ink-soft">The free plan includes 10 documents and 3 AI actions a month.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="rounded-full px-7"><Link href="/signup">Start Free</Link></Button>
          <Button asChild size="lg" variant="secondary" className="rounded-full px-7"><Link href="/contact">Contact us</Link></Button>
        </div>
      </section>
    </main>
  );
}

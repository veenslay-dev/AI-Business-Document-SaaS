import Link from "next/link";
import { Wordmark } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" aria-label="Home"><Wordmark /></Link>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</main>
      </div>
      <aside className="hidden bg-gradient-to-br from-brand to-brand-deep p-12 text-white lg:flex lg:flex-col lg:justify-end">
        <p className="font-serif text-3xl leading-snug">
          Create once.<br />Brand everything.<br />Close more clients.
        </p>
        <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/70">
          Set up your company profile and brand kit one time. Every proposal, quotation and audit
          picks up your logo, colors, terms and contact details automatically.
        </p>
      </aside>
    </div>
  );
}

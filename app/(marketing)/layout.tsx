import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/logo";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <Link href="/" aria-label="Home"><Wordmark /></Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          <Link href="/#how-it-works" className="hidden rounded px-3 py-2 text-ink-soft hover:text-ink md:block">How it works</Link>
          <Link href="/#examples" className="hidden rounded px-3 py-2 text-ink-soft hover:text-ink md:block">Examples</Link>
          <Link href="/pricing" className="hidden rounded px-3 py-2 text-ink-soft hover:text-ink sm:block">Pricing</Link>
          <Link href="/#faq" className="hidden rounded px-3 py-2 text-ink-soft hover:text-ink md:block">FAQ</Link>
          <Button asChild variant="ghost"><Link href="/login">Sign in</Link></Button>
          <Button asChild><Link href="/signup">Start Free</Link></Button>
        </nav>
      </header>
      {children}
      <footer className="mt-24 border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-ink-soft">
          <Wordmark />
          <nav aria-label="Footer" className="flex gap-5"><Link href="/pricing" className="hover:text-ink">Pricing</Link><Link href="/login" className="hover:text-ink">Sign in</Link><Link href="/signup" className="hover:text-ink">Create account</Link></nav>
        </div>
      </footer>
    </div>
  );
}

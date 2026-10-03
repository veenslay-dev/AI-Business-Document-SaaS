import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/logo";
import { getUser } from "@/lib/auth/session";
import { initials } from "@/lib/utils";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  // The public pages know who is signed in, so the buttons say "Dashboard" instead of "Sign in".
  const user = await getUser();
  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "";
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
        <Link href="/" aria-label="Home"><Wordmark /></Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm font-medium">
          <Link href="/#how-it-works" className="hidden rounded px-3 py-2 text-ink-soft hover:text-brand md:block">How it works</Link>
          <Link href="/#examples" className="hidden rounded px-3 py-2 text-ink-soft hover:text-brand md:block">Examples</Link>
          <Link href="/pricing" className="hidden rounded px-3 py-2 text-ink-soft hover:text-brand sm:block">Pricing</Link>
          <Link href="/about" className="hidden rounded px-3 py-2 text-ink-soft hover:text-brand lg:block">About</Link>
          <Link href="/contact" className="hidden rounded px-3 py-2 text-ink-soft hover:text-brand lg:block">Contact</Link>
          <Link href="/#faq" className="hidden rounded px-3 py-2 text-ink-soft hover:text-brand md:block">FAQ</Link>
          {user ? (
            <Link href="/dashboard" className="ml-1 inline-flex h-10 items-center gap-2.5 rounded-full bg-brand pl-1.5 pr-5 font-semibold text-white shadow-soft hover:bg-brand-hover">
              <span aria-hidden className="grid size-7 place-items-center rounded-full bg-white/20 text-xs font-bold">{initials(name)}</span>Go to dashboard
            </Link>
          ) : (
            <>
              <Button asChild variant="ghost"><Link href="/login">Sign in</Link></Button>
              <Button asChild className="rounded-full px-5"><Link href="/signup">Start Free</Link></Button>
            </>
          )}
        </nav>
      </header>
      {children}
      <footer className="mt-24 border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-ink-soft">
          <Wordmark />
          <nav aria-label="Footer" className="flex gap-5"><Link href="/about" className="hover:text-ink">About</Link><Link href="/pricing" className="hover:text-ink">Pricing</Link><Link href="/contact" className="hover:text-ink">Contact</Link>{user ? <Link href="/dashboard" className="hover:text-ink">Dashboard</Link> : <><Link href="/login" className="hover:text-ink">Sign in</Link><Link href="/signup" className="hover:text-ink">Create account</Link></>}</nav>
        </div>
      </footer>
    </div>
  );
}

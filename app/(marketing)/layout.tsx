import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/ui/logo";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { getUser } from "@/lib/auth/session";
import { initials } from "@/lib/utils";
import { templateMenu } from "@/lib/seo/menu";
import { TEMPLATE_HUB } from "@/lib/seo/templates";
import { ChevronDown } from "lucide-react";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { MobileMenu } from "@/components/marketing/mobile-menu";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  // The public pages know who is signed in, so the buttons say "Dashboard" instead of "Sign in".
  const user = await getUser();
  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "";
  return (
    <div className="min-h-dvh">
      <GoogleAnalytics />
      <header className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-4 sm:py-5">
        <Link href="/" aria-label="Home"><Wordmark /></Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm font-medium">
          <Link href="/#how-it-works" className="hidden rounded px-3 py-2 text-ink-soft hover:text-brand lg:block">How it works</Link>
          {/* Templates menu: opens on hover or keyboard focus and lists every template page. */}
          <div className="group relative hidden lg:block">
            <Link href={TEMPLATE_HUB.path} className="inline-flex items-center gap-1 rounded px-3 py-2 text-ink-soft hover:text-brand">Templates<ChevronDown className="size-3.5 transition group-hover:rotate-180 group-focus-within:rotate-180" aria-hidden /></Link>
            <div className="invisible absolute left-0 top-full z-40 w-72 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <ul className="rounded-xl border border-line bg-surface p-1.5 shadow-pop">
                <li><Link href={TEMPLATE_HUB.path} className="block rounded-lg px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-soft">All templates</Link></li>
                {templateMenu().map((t) => <li key={t.path}><Link href={t.path} className="block rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-brand-soft hover:text-brand">{t.name}</Link></li>)}
              </ul>
            </div>
          </div>
          <Link href="/pricing" className="hidden rounded px-3 py-2 text-ink-soft hover:text-brand lg:block">Pricing</Link>
          <Link href="/about" className="hidden rounded px-3 py-2 text-ink-soft hover:text-brand lg:block">About</Link>
          <Link href="/contact" className="hidden rounded px-3 py-2 text-ink-soft hover:text-brand lg:block">Contact</Link>
          {user ? (
            // Hovering or focusing the button reveals a small menu with Log out.
            <div className="group relative ml-1 hidden sm:block">
              <Link href="/dashboard" className="inline-flex h-10 items-center gap-2.5 rounded-full bg-brand pl-1.5 pr-5 font-semibold text-white shadow-soft hover:bg-brand-hover">
                <span aria-hidden className="grid size-7 place-items-center rounded-full bg-white/20 text-xs font-bold">{initials(name)}</span>Go to dashboard
              </Link>
              <div className="invisible absolute right-0 top-full z-40 w-56 pt-2 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <div className="rounded-xl border border-line bg-surface p-1.5 shadow-pop">
                  <p className="truncate px-3 py-2 text-xs font-normal text-ink-faint" title={user.email ?? ""}>{user.email}</p>
                  <form action={signOutAction}>
                    <input type="hidden" name="next" value="/" />
                    <button type="submit" className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink hover:bg-brand-soft hover:text-brand"><LogOut className="size-4" aria-hidden />Log out</button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden items-center gap-1 sm:flex">
              <Button asChild variant="ghost"><Link href="/login">Sign in</Link></Button>
              <Button asChild className="rounded-full px-5"><Link href="/signup">Start Free</Link></Button>
            </div>
          )}
          <MobileMenu templates={templateMenu()} user={user ? { email: user.email ?? "" } : null} />
        </nav>
      </header>
      {children}
      <footer className="mt-24 border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-4 px-5 py-8 text-sm text-ink-soft">
          <Wordmark />
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2"><Link href="/about" className="hover:text-ink">About</Link><Link href="/document-templates" className="hover:text-ink">Templates</Link><Link href="/pricing" className="hover:text-ink">Pricing</Link><Link href="/contact" className="hover:text-ink">Contact Us</Link><Link href="/terms" className="hover:text-ink">Terms &amp; Conditions</Link><Link href="/privacy" className="hover:text-ink">Privacy Policy</Link><Link href="/refund-policy" className="hover:text-ink">Refund Policy</Link>{user ? <Link href="/dashboard" className="hover:text-ink">Dashboard</Link> : <><Link href="/login" className="hover:text-ink">Sign in</Link><Link href="/signup" className="hover:text-ink">Create account</Link></>}</nav>
        </div>
      </footer>
    </div>
  );
}

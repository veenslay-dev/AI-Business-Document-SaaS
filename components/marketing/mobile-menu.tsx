"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Menu, X } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";

type Item = { name: string; path: string };

/**
 * The site menu for screens narrower than the desktop navigation. A button opens a panel under the header with every
 * main link, the template pages, and the sign in or dashboard actions. It closes on a link tap, outside tap or Escape.
 */
export function MobileMenu({ templates, user }: { templates: Item[]; user: { email: string } | null }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);
  const link = "flex min-h-11 items-center rounded-lg px-3 text-[15px] font-medium text-ink hover:bg-brand-soft hover:text-brand";

  return (
    <div className="lg:hidden">
      <button ref={button} type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"}
        className="grid size-11 cursor-pointer place-items-center rounded-full border border-line-strong bg-surface text-ink shadow-soft hover:text-brand">
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>
      {open && <div aria-hidden className="fixed inset-0 z-30" onClick={close} />}
      {open && (
        <nav id="mobile-menu" aria-label="Site menu" className="absolute inset-x-4 top-full z-40 mt-1 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-2 shadow-pop sm:left-auto sm:w-80">
          <ul>
            <li><Link href="/#how-it-works" onClick={close} className={link}>How it works</Link></li>
            <li className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Templates</li>
            <li><Link href="/document-templates" onClick={close} className={`${link} font-semibold text-brand`}>All templates</Link></li>
            {templates.map((t) => <li key={t.path}><Link href={t.path} onClick={close} className={`${link} pl-6`}>{t.name}</Link></li>)}
            <li className="mt-1 border-t border-line pt-1"><Link href="/pricing" onClick={close} className={link}>Pricing</Link></li>
            <li><Link href="/about" onClick={close} className={link}>About</Link></li>
            <li><Link href="/contact" onClick={close} className={link}>Contact</Link></li>
          </ul>
          <div className="mt-2 space-y-2 border-t border-line p-2 pt-3">
            {user ? (
              <>
                <p className="truncate px-1 text-xs text-ink-faint" title={user.email}>{user.email}</p>
                <Link href="/dashboard" onClick={close} className="flex h-11 items-center justify-center rounded-full bg-brand font-semibold text-white hover:bg-brand-hover">Go to dashboard</Link>
                <form action={signOutAction}>
                  <input type="hidden" name="next" value="/" />
                  <button type="submit" className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-line-strong font-medium text-ink hover:bg-brand-soft"><LogOut className="size-4" aria-hidden />Log out</button>
                </form>
              </>
            ) : (
              <>
                <Link href="/signup" onClick={close} className="flex h-11 items-center justify-center rounded-full bg-brand font-semibold text-white hover:bg-brand-hover">Start Free</Link>
                <Link href="/login" onClick={close} className="flex h-11 items-center justify-center rounded-full border border-line-strong font-medium text-ink hover:bg-brand-soft">Sign in</Link>
              </>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}

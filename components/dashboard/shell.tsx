"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, ChevronsUpDown, ArrowRight, LogOut, Menu, Search, TrendingUp, X } from "lucide-react";
import { NotificationsMenu, type NotificationItem } from "./notifications";
import { PRODUCT_NAME, Wordmark } from "@/components/ui/logo";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { NAV } from "./nav";
import { signOutAction } from "@/lib/actions/auth";
import { switchWorkspaceAction } from "@/lib/actions/workspace";
import { cn, initials } from "@/lib/utils";

function UpgradeCard() {
  return (
    <div className="mx-3 mt-3 rounded-xl bg-gradient-to-br from-brand-soft to-white p-4 ring-1 ring-brand/10">
      <span aria-hidden className="mb-3 grid size-9 place-items-center rounded-lg bg-white text-brand shadow-soft"><TrendingUp className="size-[18px]" /></span>
      <p className="text-sm font-semibold leading-snug">Grow your business with <span className="text-brand">{PRODUCT_NAME}</span></p>
      <Link href="/settings/subscription" className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-sm font-semibold text-white hover:bg-brand-hover">Upgrade Plan <ArrowRight className="size-4" aria-hidden /></Link>
    </div>
  );
}

type WorkspaceOption = { id: string; name: string; logoUrl: string | null; role: string };

export function AppShell({
  children, workspaces, activeId, userName, userEmail, notifications, unread,
}: {
  children: React.ReactNode; workspaces: WorkspaceOption[]; activeId: string; userName: string; userEmail: string;
  notifications: NotificationItem[]; unread: number;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];

  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-0.5 px-3">
      {NAV.filter((n) => n.ready).map(({ href, label, icon: Icon }) => {
        const current = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href} href={href} onClick={() => setOpen(false)} aria-current={current ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors",
              current ? "bg-brand-soft font-semibold text-brand" : "text-ink-soft hover:bg-black/[0.035] hover:text-ink",
            )}
          >
            <Icon className="size-[18px]" aria-hidden />{label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="hidden border-r border-line bg-surface lg:block">
        <div className="sticky top-0 flex h-dvh flex-col py-4">
          <Link href="/dashboard" className="mb-6 px-5"><Wordmark /></Link>
          <div className="min-h-0 flex-1 overflow-y-auto">{nav}</div>
          <UpgradeCard />
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-surface py-4 shadow-pop">
            <div className="mb-6 flex items-center justify-between px-5">
              <Wordmark />
              <button aria-label="Close menu" onClick={() => setOpen(false)}><X className="size-5" /></button>
            </div>
            {nav}
          </div>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
          <button className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu className="size-5" /></button>

          <Dropdown>
            <DropdownTrigger className="flex max-w-[16rem] items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-black/5">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-brand text-[10px] font-bold text-white">{initials(active?.name)}</span>
              <span className="truncate font-medium">{active?.name}</span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-ink-faint" aria-hidden />
            </DropdownTrigger>
            <DropdownContent align="start">
              <DropdownLabel>Workspaces</DropdownLabel>
              {workspaces.map((w) => (
                <DropdownItem key={w.id} onSelect={() => switchWorkspaceAction(w.id)}>
                  <span className="truncate">{w.name}</span>
                  {w.id === activeId && <Check className="ml-auto size-4 text-brand" aria-hidden />}
                </DropdownItem>
              ))}
            </DropdownContent>
          </Dropdown>

          <form action="/search" role="search" className="ml-2 hidden max-w-xl flex-1 sm:block">
            <label htmlFor="global-search" className="sr-only">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-2.5 size-4 text-ink-faint" aria-hidden />
              <input id="global-search" name="q" placeholder="Search clients and documents" className="h-10 w-full rounded-full border border-transparent bg-paper pl-10 pr-4 text-sm placeholder:text-ink-faint focus-visible:border-brand focus-visible:bg-surface focus-visible:outline-none" />
            </div>
          </form>
          <div className="ml-auto flex items-center gap-1">
            <Link href="/search" aria-label="Search" className="grid size-8 place-items-center rounded-md hover:bg-black/5 sm:hidden"><Search className="size-[18px]" /></Link>
            <NotificationsMenu items={notifications} unread={unread} />
            <Dropdown>
              <DropdownTrigger aria-label="Account menu" className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-black/5 sm:pr-3">
                <span className="grid size-8 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">{initials(userName)}</span>
                <span className="hidden max-w-32 truncate text-sm font-semibold sm:block">{userName}</span>
                <ChevronDown className="hidden size-4 text-ink-faint sm:block" aria-hidden />
              </DropdownTrigger>
              <DropdownContent align="end">
                <div className="px-2.5 py-2">
                  <p className="truncate text-sm font-medium">{userName}</p>
                  <p className="truncate text-xs text-ink-faint">{userEmail}</p>
                </div>
                <DropdownSeparator />
                <DropdownItem asChild><Link href="/settings">Settings</Link></DropdownItem>
                <DropdownItem onSelect={() => signOutAction()}><LogOut className="size-4" aria-hidden />Sign out</DropdownItem>
              </DropdownContent>
            </Dropdown>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

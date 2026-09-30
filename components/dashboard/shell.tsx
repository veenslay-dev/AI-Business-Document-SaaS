"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronsUpDown, LogOut, Menu, X } from "lucide-react";
import { Wordmark } from "@/components/ui/logo";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { NAV } from "./nav";
import { signOutAction } from "@/lib/actions/auth";
import { switchWorkspaceAction } from "@/lib/actions/workspace";
import { cn, initials } from "@/lib/utils";

type WorkspaceOption = { id: string; name: string; logoUrl: string | null; role: string };

export function AppShell({
  children, workspaces, activeId, userName, userEmail,
}: {
  children: React.ReactNode; workspaces: WorkspaceOption[]; activeId: string; userName: string; userEmail: string;
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
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
              current ? "bg-black/[0.06] font-medium text-ink" : "text-ink-soft hover:bg-black/[0.04] hover:text-ink",
            )}
          >
            <Icon className="size-4" aria-hidden />{label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="hidden border-r border-line bg-surface lg:block">
        <div className="sticky top-0 flex h-dvh flex-col py-4">
          <Link href="/dashboard" className="mb-6 px-5"><Wordmark /></Link>
          {nav}
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
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur sm:px-6">
          <button className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu className="size-5" /></button>

          <Dropdown>
            <DropdownTrigger className="flex max-w-[16rem] items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-black/5">
              <span className="grid size-6 shrink-0 place-items-center rounded bg-brand text-[10px] font-semibold text-white">{initials(active?.name)}</span>
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

          <div className="ml-auto">
            <Dropdown>
              <DropdownTrigger aria-label="Account menu" className="grid size-8 place-items-center rounded-full bg-black/[0.07] text-xs font-semibold hover:bg-black/10">
                {initials(userName)}
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
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

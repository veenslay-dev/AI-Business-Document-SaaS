"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Overview" }, { href: "/admin/workspaces", label: "Workspaces" }, { href: "/admin/users", label: "Users" },
  { href: "/admin/messages", label: "Messages" }, { href: "/admin/settings", label: "Settings" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="-mx-1 mb-8 flex gap-1 overflow-x-auto border-b border-line px-1">
      {LINKS.map((l) => {
        const current = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={current ? "page" : undefined}
            className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm", current ? "border-brand font-semibold text-brand" : "border-transparent text-ink-soft hover:text-ink")}>{l.label}</Link>
        );
      })}
    </nav>
  );
}

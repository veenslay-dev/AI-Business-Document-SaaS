"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/settings", label: "Profile" },
  { href: "/settings/company", label: "Company" },
  { href: "/brand-kit", label: "Brand Kit" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/subscription", label: "Subscription" },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings" className="-mx-1 mb-8 flex gap-1 overflow-x-auto border-b border-line px-1">
      {LINKS.map((l) => {
        const current = l.href === "/settings" ? pathname === "/settings" : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={current ? "page" : undefined}
            className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm",
              current ? "border-brand font-medium text-ink" : "border-transparent text-ink-soft hover:text-ink")}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bell } from "lucide-react";
import { Dropdown, DropdownContent, DropdownTrigger } from "@/components/ui/dropdown";
import { markNotificationsSeenAction } from "@/lib/actions/workspace";
import { timeAgo } from "@/lib/time";

export type NotificationItem = { id: string; at: string; href: string; title: string; text: string; detail: string | null };

export function NotificationsMenu({ items, unread }: { items: NotificationItem[]; unread: number }) {
  const [count, setCount] = useState(unread);
  const [, start] = useTransition();
  return (
    <Dropdown onOpenChange={(open) => { if (open && count > 0) { setCount(0); start(async () => { await markNotificationsSeenAction(); }); } }}>
      <DropdownTrigger aria-label={count > 0 ? `Notifications, ${count} new` : "Notifications"} className="relative grid size-8 place-items-center rounded-md hover:bg-black/5">
        <Bell className="size-[18px]" />
        {count > 0 && <span className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-signal px-1 text-[10px] font-semibold leading-4 text-white">{count > 9 ? "9+" : count}</span>}
      </DropdownTrigger>
      <DropdownContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-0">
        <p className="border-b border-line px-3 py-2 text-sm font-semibold">Notifications</p>
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-ink-soft">Nothing yet. You'll see when clients open, accept or comment on your documents.</p>
        ) : (
          <ul className="max-h-96 divide-y divide-line overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <Link href={n.href} className="block px-3 py-2.5 text-sm hover:bg-paper">
                  <span className="font-medium">{n.title}</span> {n.text}
                  {n.detail && <span className="mt-0.5 block truncate text-ink-soft">“{n.detail}”</span>}
                  <span className="mt-0.5 block text-xs text-ink-faint">{timeAgo(n.at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DropdownContent>
    </Dropdown>
  );
}

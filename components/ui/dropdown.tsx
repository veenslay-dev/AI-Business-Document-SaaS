"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const Dropdown = DropdownMenu.Root;
export const DropdownTrigger = DropdownMenu.Trigger;

export function DropdownContent({ className, ...props }: React.ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        sideOffset={6}
        className={cn("z-50 min-w-56 rounded-md border border-line bg-surface p-1 shadow-pop", className)}
        {...props}
      />
    </DropdownMenu.Portal>
  );
}

export function DropdownItem({ className, ...props }: React.ComponentProps<typeof DropdownMenu.Item>) {
  return (
    <DropdownMenu.Item
      className={cn("flex cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-black/5", className)}
      {...props}
    />
  );
}

export const DropdownLabel = ({ className, ...props }: React.ComponentProps<typeof DropdownMenu.Label>) => (
  <DropdownMenu.Label className={cn("px-2.5 py-1.5 text-xs font-medium uppercase tracking-wider text-ink-faint", className)} {...props} />
);
export const DropdownSeparator = () => <DropdownMenu.Separator className="my-1 h-px bg-line" />;

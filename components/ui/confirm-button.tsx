"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { Button, type ButtonProps } from "./button";
import type { ActionResult } from "@/lib/actions/result";

/** A button that asks before running a destructive server action, then reports the result. */
export function ConfirmButton({
  action, title, description, confirmLabel = "Delete", children, onDone, ...btn
}: {
  action: () => Promise<ActionResult<unknown>>; title: string; description: string; confirmLabel?: string;
  onDone?: () => void; children: React.ReactNode;
} & Omit<ButtonProps, "onClick" | "children">) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function run() {
    start(async () => {
      try {
        const res = await action();
        if (res.ok) { toast.success(res.message ?? "Done."); setOpen(false); onDone?.(); }
        else toast.error(res.error);
      } catch (e) {
        if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
        toast.error("We couldn't reach the server. Check your connection and try again.");
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild><Button type="button" {...btn}>{children}</Button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface p-6 shadow-pop">
          <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-ink-soft">{description}</Dialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild><Button variant="secondary" disabled={pending}>Cancel</Button></Dialog.Close>
            <Button variant="danger" loading={pending} onClick={run}>{confirmLabel}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

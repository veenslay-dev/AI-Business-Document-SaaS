"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveAsTemplateAction } from "@/lib/actions/config";

export function SaveTemplateButton({ documentId, beforeSave }: { documentId: string; beforeSave: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild><Button size="sm" variant="ghost" title="Save this layout as a template"><LayoutTemplate className="size-4" aria-hidden /><span className="hidden xl:inline">Save as template</span></Button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface p-6 shadow-pop">
          <Dialog.Title className="text-lg font-semibold">Save as template</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-ink-soft">Saves this layout and its section list. New documents can start from it. The text you wrote isn't copied.</Dialog.Description>
          <form className="mt-4" onSubmit={(e) => { e.preventDefault(); start(async () => {
            try {
              await beforeSave();
              const res = await saveAsTemplateAction(documentId, name);
              if (res.ok) { toast.success(res.message ?? "Saved."); setOpen(false); setName(""); } else toast.error(res.error);
            } catch { toast.error("We couldn't reach the server. Try again."); }
          }); }}>
            <label htmlFor="tpl-name" className="mb-1 block text-sm font-medium">Template name</label>
            <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="SEO retainer proposal" autoFocus />
            <div className="mt-5 flex justify-end gap-2"><Dialog.Close asChild><Button type="button" variant="secondary">Cancel</Button></Dialog.Close><Button type="submit" loading={pending} disabled={name.trim().length < 2}>Save template</Button></div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

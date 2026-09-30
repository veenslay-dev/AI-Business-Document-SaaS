"use client";

import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteTemplateAction, setDefaultTemplateAction } from "@/lib/actions/config";

export function CustomTemplateActions({ id, type, isDefault, canEdit }: { id: string; type: string; isDefault: boolean; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!canEdit) return null;
  return (
    <div className="flex gap-1">
      <Button size="sm" variant="secondary" loading={pending} onClick={() => start(async () => {
        const res = await setDefaultTemplateAction(isDefault ? null : id, type);
        if (res.ok) { toast.success(res.message ?? "Saved."); router.refresh(); } else toast.error(res.error);
      })}>{isDefault ? "Remove default" : "Make default"}</Button>
      <ConfirmButton size="sm" variant="ghost" className="text-signal hover:text-signal" title="Delete this template?" description="Documents that use it will fall back to the built-in layout. Their content isn't changed."
        action={() => deleteTemplateAction(id)} onDone={() => router.refresh()}>Delete</ConfirmButton>
    </div>
  );
}

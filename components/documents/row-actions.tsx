"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import { Copy, ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { deleteDocumentAction, duplicateDocumentAction } from "@/lib/actions/documents";

export function DocumentRowActions({ id, href, canDelete }: { id: string; href: string; canDelete: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function duplicate() {
    start(async () => {
      try {
        const res = await duplicateDocumentAction(id);
        if (res.ok && res.data) { toast.success(res.message ?? "Duplicated."); router.push(res.data.href); }
        else if (!res.ok) toast.error(res.error);
      } catch { toast.error("We couldn't reach the server. Try again."); }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Link href={href} className="hidden h-8 items-center gap-1 rounded-md px-2 text-sm text-ink-soft hover:bg-black/5 hover:text-ink sm:inline-flex"><Pencil className="size-3.5" aria-hidden />Open</Link>
      <Dropdown>
        <DropdownTrigger aria-label="More actions" disabled={pending} className="grid size-8 place-items-center rounded-md hover:bg-black/5"><MoreHorizontal className="size-4" /></DropdownTrigger>
        <DropdownContent align="end" className="min-w-44">
          <DropdownItem asChild><Link href={href}><ExternalLink className="size-4" aria-hidden />Open</Link></DropdownItem>
          <DropdownItem onSelect={duplicate}><Copy className="size-4" aria-hidden />Duplicate</DropdownItem>
          {canDelete && (<><DropdownSeparator />
            <div onKeyDown={(e) => e.stopPropagation()}>
              <ConfirmButton variant="ghost" className="w-full justify-start px-2.5 text-signal hover:text-signal" title="Delete this document?"
                description="This removes the document, its share link and its tracking history. It can't be undone."
                action={() => deleteDocumentAction(id)} onDone={() => router.refresh()}><Trash2 className="size-4" aria-hidden />Delete</ConfirmButton>
            </div></>)}
        </DropdownContent>
      </Dropdown>
    </div>
  );
}

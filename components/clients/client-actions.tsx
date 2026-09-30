"use client";

import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { archiveClientAction, deleteClientAction } from "@/lib/actions/clients";

export function ClientActions({ id, archived, canDelete }: { id: string; archived: boolean; canDelete: boolean }) {
  const router = useRouter();
  return (
    <>
      <ConfirmButton variant="secondary" confirmLabel={archived ? "Restore" : "Archive"} title={archived ? "Restore this client?" : "Archive this client?"}
        description={archived ? "They'll appear in your client list again." : "They'll be hidden from the client list and pickers. Their documents stay as they are."}
        action={() => archiveClientAction(id, !archived)} onDone={() => router.refresh()}>
        {archived ? <ArchiveRestore className="size-4" aria-hidden /> : <Archive className="size-4" aria-hidden />}{archived ? "Restore" : "Archive"}
      </ConfirmButton>
      {canDelete && (
        <ConfirmButton variant="ghost" className="text-signal hover:text-signal" title="Delete this client?"
          description="This removes the client and their projects. Documents are kept but will no longer be linked to a client."
          action={() => deleteClientAction(id)} onDone={() => router.push("/clients")}>
          <Trash2 className="size-4" aria-hidden />Delete
        </ConfirmButton>
      )}
    </>
  );
}

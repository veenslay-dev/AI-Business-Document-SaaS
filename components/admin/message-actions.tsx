"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminSetMessageStatusAction } from "@/lib/actions/admin";

export function MessageStatusButton({ id, status }: { id: string; status: "new" | "handled" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = status === "new" ? "handled" : "new";
  return (
    <Button size="sm" variant="secondary" loading={pending} onClick={() => start(async () => {
      try { const r = await adminSetMessageStatusAction(id, next); if (r.ok) router.refresh(); else toast.error(r.error); } catch { toast.error("We couldn't reach the server."); }
    })}>{status === "new" ? "Mark handled" : "Reopen"}</Button>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { acceptInviteAction } from "@/lib/actions/team";

export function AcceptInviteButton({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <Button className="w-full" loading={pending} onClick={() => start(async () => {
        try { const res = await acceptInviteAction(token); if (res && !res.ok) setError(res.error); }
        catch (e) { if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e; setError("We couldn't reach the server. Try again."); }
      })}>Join workspace</Button>
    </div>
  );
}

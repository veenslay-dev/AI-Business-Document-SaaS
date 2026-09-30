"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Last-resort boundary. Shows a plain message; the underlying error is only logged. */
export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[app] render error", error.digest ?? ""); }, [error]);
  return (
    <main className="grid min-h-dvh place-items-center bg-paper p-6 text-center">
      <div className="max-w-sm">
        <h1 className="font-serif text-2xl">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-soft">We hit a problem loading this page. Your work is saved. Try again, and if it keeps happening, reload or come back in a few minutes.</p>
        <Button className="mt-6" onClick={reset}>Try again</Button>
        {error.digest && <p className="mt-4 text-xs text-ink-faint">Reference: {error.digest}</p>}
      </div>
    </main>
  );
}

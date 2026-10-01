"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[app] page error", error.digest ?? ""); }, [error]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <div role="alert" className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-soft">
      <h1 className="font-serif text-2xl">{offline ? "You're offline" : "This page didn't load"}</h1>
      <p className="mt-2 text-sm text-ink-soft">{offline ? "Check your connection and try again. Anything you typed is still on the page." : "Something went wrong on our side. Your saved work is safe."}</p>
      <Button className="mt-5" onClick={reset}>Try again</Button>
    </div>
  );
}

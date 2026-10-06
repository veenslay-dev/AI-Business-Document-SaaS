"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";
import { refreshSampleAuditAction } from "@/lib/actions/admin-pages";

/** Shown on the edit page for the SEO Audit Report Generator. One click runs a real scan of our own site and saves it as the page's sample. */
export function SampleAuditPanel({ scanned, siteAddress }: { scanned: { url: string; at: string } | null; siteAddress: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    start(async () => {
      try {
        const res = await refreshSampleAuditAction();
        if (res.ok) { toast.success(res.message ?? "Saved."); router.refresh(); } else setError(res.error);
      } catch { setError("The scan took too long or the server could not be reached. Try again."); }
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-6 shadow-soft">
      <h3 className="font-bold">Sample report on this page</h3>
      <p className="text-sm text-ink-soft">The page shows a real audit of our own website, with PrioDraft as both author and client, so no made-up company appears. It is only as fresh as the last run.</p>
      <dl className="grid gap-1 text-sm">
        <div className="flex gap-2"><dt className="text-ink-faint">Will scan:</dt><dd className="font-medium">{siteAddress}</dd></div>
        <div className="flex gap-2"><dt className="text-ink-faint">Last audit:</dt><dd className="font-medium">{scanned ? `${scanned.url}, ${new Date(scanned.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : "None yet. The page shows a plain call to action instead of a preview."}</dd></div>
      </dl>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <Button type="button" onClick={run} loading={pending}>{scanned ? "Run a fresh audit now" : "Run the audit now"}</Button>
      <p className="text-xs text-ink-faint">The scan reads the home page and a few inner pages, like any audit, and can take up to a minute.</p>
    </section>
  );
}

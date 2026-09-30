"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Copy, ExternalLink, Link2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { regenerateLinkAction, shareDocumentAction } from "@/lib/actions/documents";
import { generateFollowUpAction } from "@/lib/actions/ai";

/** Publishes the document (freezing its branding on first share) and shows the public link. */
export function ShareDialog({ documentId, initialUrl, status, hasAi, onShared }: { documentId: string; initialUrl: string; status: string; hasAi: boolean; onShared?: () => void }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(status === "draft" ? null : initialUrl);
  const [expires, setExpires] = useState("0");
  const [copied, setCopied] = useState(false);
  const [followUp, setFollowUp] = useState<{ subject: string; body: string } | null>(null);
  const [pending, start] = useTransition();

  function publish() {
    start(async () => {
      try {
        const res = await shareDocumentAction(documentId, { expiresInDays: Number(expires) || null });
        if (res.ok && res.data) { setUrl(res.data.url); onShared?.(); } else if (!res.ok) toast.error(res.error);
      } catch { toast.error("We couldn't reach the server. Check your connection and try again."); }
    });
  }
  function rotate() {
    start(async () => {
      const res = await regenerateLinkAction(documentId);
      if (res.ok && res.data) { setUrl(res.data.url); toast.success(res.message ?? "New link created."); } else if (!res.ok) toast.error(res.error);
    });
  }
  async function copy() {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { toast.error("Couldn't copy. Select the link and copy it manually."); }
  }
  function draftFollowUp() {
    start(async () => {
      const res = await generateFollowUpAction(documentId);
      if (res.ok && res.data) setFollowUp(res.data); else if (!res.ok) toast.error(res.error);
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild><Button size="sm"><Link2 className="size-4" aria-hidden />Share</Button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-surface p-6 shadow-pop">
          <Dialog.Title className="text-lg font-semibold">Share with your client</Dialog.Title>
          {!url ? (
            <>
              <Dialog.Description className="mt-2 text-sm text-ink-soft">
                Sharing creates a private link that shows only this document. Your current company details and brand kit are saved with it, so later brand changes won't alter what the client sees.
              </Dialog.Description>
              <label className="mt-4 block text-sm font-medium" htmlFor="expiry">Link expires</label>
              <Select id="expiry" value={expires} onChange={(e) => setExpires(e.target.value)} className="mt-1">
                <option value="0">Never</option><option value="7">In 7 days</option><option value="14">In 14 days</option><option value="30">In 30 days</option><option value="90">In 90 days</option>
              </Select>
              <div className="mt-6 flex justify-end gap-2"><Dialog.Close asChild><Button variant="secondary">Cancel</Button></Dialog.Close><Button loading={pending} onClick={publish}>Create share link</Button></div>
            </>
          ) : (
            <>
              <Dialog.Description className="mt-2 text-sm text-ink-soft">Anyone with this link can view the document. It doesn't give access to your workspace.</Dialog.Description>
              <div className="mt-4 flex gap-2">
                <input readOnly value={url} aria-label="Share link" className="h-9 min-w-0 flex-1 rounded-md border border-line-strong bg-paper px-3 text-sm" onFocus={(e) => e.currentTarget.select()} />
                <Button variant="secondary" onClick={copy}>{copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}{copied ? "Copied" : "Copy"}</Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild variant="ghost" size="sm"><a href={`${url}?preview=1`} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" aria-hidden />Preview as client</a></Button>
                <Button variant="ghost" size="sm" loading={pending} onClick={rotate}><RefreshCw className="size-4" aria-hidden />New link (revoke old)</Button>
                {hasAi && <Button variant="ghost" size="sm" loading={pending} onClick={draftFollowUp}>Draft follow-up email</Button>}
              </div>
              {followUp && (
                <div className="mt-4 rounded-md border border-line bg-paper p-3 text-sm">
                  <p className="font-medium">{followUp.subject}</p><p className="mt-2 whitespace-pre-line text-ink-soft">{followUp.body}</p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => { void navigator.clipboard.writeText(`${followUp.subject}\n\n${followUp.body}`); toast.success("Copied."); }}>Copy email</Button>
                </div>
              )}
              <div className="mt-6 flex justify-end"><Dialog.Close asChild><Button>Done</Button></Dialog.Close></div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

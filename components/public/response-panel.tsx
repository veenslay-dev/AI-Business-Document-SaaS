"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { PdfButton } from "@/components/documents/editor/pdf-button";
import { SignaturePad } from "./signature-pad";
import { acceptDocumentAction, rejectDocumentAction, requestChangesAction } from "@/lib/actions/public";
import type { ActionResult } from "@/lib/actions/result";

type Kind = "accept" | "reject" | "changes";

export function ResponsePanel({ token, canRespond, noun, pdfUrl }: { token: string; canRespond: boolean; noun: string; pdfUrl: string }) {
  const router = useRouter();
  const [open, setOpen] = useState<Kind | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [agree, setAgree] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const f = (k: string) => fields[k] ?? "";
  const set = (k: string, v: string) => setFields((s) => ({ ...s, [k]: v }));

  function submit(kind: Kind) {
    setError(null); setErrs({});
    start(async () => {
      try {
        let res: ActionResult;
        if (kind === "accept") res = await acceptDocumentAction(token, { name: f("name"), email: f("email"), designation: f("designation"), agree: agree as true, signature: signature ?? "" });
        else if (kind === "reject") res = await rejectDocumentAction(token, { reason: f("reason"), name: f("name") });
        else res = await requestChangesAction(token, { comment: f("comment"), name: f("name"), email: f("email") });
        if (res.ok) { setDone(res.message ?? "Done."); setOpen(null); router.refresh(); }
        else { setErrs(res.fieldErrors ?? {}); setError(res.error); }
      } catch { setError("We couldn't reach the server. Check your connection and try again."); }
    });
  }

  const dlg = (kind: Kind, title: string, desc: string, body: React.ReactNode, confirm: string, danger = false) => (
    <Dialog.Root open={open === kind} onOpenChange={(o) => { setOpen(o ? kind : null); setError(null); setErrs({}); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-6 shadow-pop">
          <Dialog.Title className="font-serif text-2xl">{title}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-ink-soft">{desc}</Dialog.Description>
          <form className="mt-5 space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); submit(kind); }}>
            {error && <FormMessage kind="error">{error}</FormMessage>}
            {body}
            <div className="flex justify-end gap-2 pt-2"><Dialog.Close asChild><Button type="button" variant="secondary">Cancel</Button></Dialog.Close><Button type="submit" variant={danger ? "danger" : "primary"} loading={pending}>{confirm}</Button></div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <PdfButton url={pdfUrl} label="Download PDF" />
        {canRespond && (<>
          <Button size="sm" variant="ghost" onClick={() => setOpen("changes")}><MessageSquare className="size-4" aria-hidden />Request changes</Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen("reject")}><X className="size-4" aria-hidden />Reject</Button>
          <Button size="sm" onClick={() => setOpen("accept")}><Check className="size-4" aria-hidden />Accept {noun}</Button>
        </>)}
      </div>
      {done && <div role="status" className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md rounded-md bg-ok px-4 py-3 text-sm font-medium text-white shadow-pop">{done}</div>}

      {dlg("accept", `Accept ${noun}`, "Enter your details and sign. The sender is notified right away and gets a record of your acceptance.", (<>
        <Field label="Full name" htmlFor="a-name" error={errs.name}><Input id="a-name" autoComplete="name" value={f("name")} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errs.name} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor="a-email" error={errs.email}><Input id="a-email" type="email" autoComplete="email" value={f("email")} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errs.email} /></Field>
          <Field label="Designation" htmlFor="a-des" error={errs.designation}><Input id="a-des" value={f("designation")} onChange={(e) => set("designation", e.target.value)} placeholder="Managing Director" /></Field>
        </div>
        <div><SignaturePad name={f("name")} onChange={setSignature} />{errs.signature && <p role="alert" className="mt-1 text-xs text-signal">{errs.signature}</p>}</div>
        <div><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />I agree to the {noun} terms.</label>{errs.agree && <p role="alert" className="mt-1 text-xs text-signal">{errs.agree}</p>}</div>
      </>), `Accept ${noun}`)}

      {dlg("changes", "Request changes", "Tell the sender what you'd like adjusted. They'll see your note next to the document.", (<>
        <Field label="What should change?" htmlFor="c-comment" error={errs.comment}><Textarea id="c-comment" rows={5} value={f("comment")} onChange={(e) => set("comment", e.target.value)} aria-invalid={!!errs.comment} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name (optional)" htmlFor="c-name"><Input id="c-name" value={f("name")} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Email (optional)" htmlFor="c-email" error={errs.email}><Input id="c-email" type="email" value={f("email")} onChange={(e) => set("email", e.target.value)} /></Field>
        </div></>), "Send request")}

      {dlg("reject", `Reject ${noun}`, "This tells the sender you're not going ahead. You can add a reason if you like.", (<>
        <Field label="Reason (optional)" htmlFor="r-reason"><Textarea id="r-reason" rows={4} value={f("reason")} onChange={(e) => set("reason", e.target.value)} /></Field>
        <Field label="Your name (optional)" htmlFor="r-name"><Input id="r-name" value={f("name")} onChange={(e) => set("name", e.target.value)} /></Field></>), `Reject ${noun}`, true)}
    </>
  );
}

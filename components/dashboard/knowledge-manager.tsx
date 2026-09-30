"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { FileUp, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { inputCls, Labeled } from "@/components/documents/editor/ui";
import { deleteKnowledgeAction, saveKnowledgeAction } from "@/lib/actions/config";
import { KB_LABELS, KB_TYPES } from "@/lib/validation/config";

export type KbItem = { id: string | null; title: string; type: (typeof KB_TYPES)[number]; content: string };

function Entry({ initial, onDone, onCancel }: { initial: KbItem; onDone: () => void; onCancel?: () => void }) {
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const [errs, setErrs] = useState<Record<string, string>>({});
  const file = useRef<HTMLInputElement>(null);

  async function readFile(f: File) {
    if (f.size > 200_000) return toast.error("That file is too large. Paste the relevant part instead (up to about 20,000 characters).");
    if (!/\.(txt|md|csv)$/i.test(f.name) && !f.type.startsWith("text/")) return toast.error("Upload a .txt, .md or .csv file, or paste the text.");
    setV((x) => ({ ...x, content: (x.content ? x.content + "\n\n" : "") + "" }));
    const text = await f.text();
    setV((x) => ({ ...x, title: x.title || f.name.replace(/\.[^.]+$/, ""), content: text.slice(0, 20_000) }));
  }
  function save() {
    setErrs({});
    start(async () => {
      try {
        const res = await saveKnowledgeAction(v.id, { title: v.title, type: v.type, content: v.content });
        if (res.ok) { toast.success(res.message ?? "Saved."); onDone(); } else { setErrs(res.fieldErrors ?? {}); toast.error(res.error); }
      } catch { toast.error("We couldn't reach the server. Try again."); }
    });
  }
  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-soft">
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <Labeled label="Title"><input className={inputCls} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} aria-invalid={!!errs.title} />{errs.title && <span className="text-xs text-signal">{errs.title}</span>}</Labeled>
        <Labeled label="Type"><select className={inputCls} value={v.type} onChange={(e) => setV({ ...v, type: e.target.value as KbItem["type"] })}>{KB_TYPES.map((t) => <option key={t} value={t}>{KB_LABELS[t]}</option>)}</select></Labeled>
      </div>
      <Labeled label="Content" className="mt-3"><textarea className={`${inputCls} min-h-32`} value={v.content} onChange={(e) => setV({ ...v, content: e.target.value })} aria-invalid={!!errs.content} />{errs.content && <span className="text-xs text-signal">{errs.content}</span>}</Labeled>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" loading={pending} onClick={save}>{v.id ? "Save" : "Add entry"}</Button>
        <input ref={file} type="file" accept=".txt,.md,.csv,text/*" className="sr-only" aria-label="Upload a text file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void readFile(f); e.target.value = ""; }} />
        <Button size="sm" variant="secondary" onClick={() => file.current?.click()}><FileUp className="size-4" aria-hidden />Load from file</Button>
        {onCancel && <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>}
        {v.id && <ConfirmButton size="sm" variant="ghost" className="ml-auto text-signal hover:text-signal" title="Delete this entry?" description="The AI will stop using it in future drafts." action={() => deleteKnowledgeAction(v.id!)} onDone={onDone}>Delete</ConfirmButton>}
      </div>
    </div>
  );
}

export function KnowledgeManager({ items }: { items: KbItem[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const done = () => { setAdding(false); setEditing(null); router.refresh(); };
  return (
    <div className="space-y-3">
      {adding ? <Entry initial={{ id: null, title: "", type: "case_study", content: "" }} onDone={done} onCancel={() => setAdding(false)} />
        : <Button variant="secondary" onClick={() => setAdding(true)}><Plus className="size-4" aria-hidden />Add entry</Button>}
      {items.map((it) => editing === it.id ? <Entry key={it.id} initial={it} onDone={done} onCancel={() => setEditing(null)} /> : (
        <button key={it.id} type="button" onClick={() => setEditing(it.id)} className="block w-full rounded-lg border border-line bg-surface p-4 text-left shadow-soft hover:bg-paper">
          <span className="flex items-center gap-2"><span className="font-medium">{it.title}</span><span className="rounded bg-black/5 px-1.5 py-0.5 text-xs text-ink-soft">{KB_LABELS[it.type]}</span></span>
          <span className="mt-1 line-clamp-2 block text-sm text-ink-soft">{it.content}</span>
        </button>
      ))}
    </div>
  );
}

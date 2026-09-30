"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, FilePlus2, Loader2, Plus, Save, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { DocumentRenderer } from "@/components/documents/document-renderer";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { DocStatusBadge } from "@/components/ui/status";
import { AiMenu } from "./ai-menu";
import { AuditFindingsEditor } from "./audit-editors";
import {
  HeadingEditor, ImageEditor, ListEditor, PricingEditor, SimpleBlockEditor, TableEditor, TextBlockEditor, TimelineEditor, blockFromGenerated, type BlockCtx,
} from "./block-editors";
import { PdfButton } from "./pdf-button";
import { PreviewFrame } from "./preview-frame";
import { QuotationEditor } from "./quotation-editor";
import { SaveTemplateButton } from "./save-template";
import { ShareDialog } from "./share-dialog";
import { IconButton, Labeled, MoveControls, inputCls, move } from "./ui";
import { saveDocumentAction } from "@/lib/actions/documents";
import type { BrandContext } from "@/lib/documents/branding";
import { BLOCK_LABELS, emptyBlock, emptySection, type Block, type BlockType, type DocumentContent } from "@/lib/documents/content";
import type { DocType, TemplateConfig } from "@/lib/documents/templates";
import { cn } from "@/lib/utils";

export type EditorTemplate = { value: string; label: string; config: TemplateConfig };
export type EditorProps = {
  doc: { id: string; type: DocType; title: string; status: string; templateValue: string; publicUrl: string; frozen: boolean; hasAcceptance: boolean };
  initialContent: DocumentContent;
  brand: BrandContext;
  templates: EditorTemplate[];
  packages: BlockCtx["packages"];
  locked: boolean;
  hasAi: boolean;
  backHref: string;
  acceptance: { name: string; designation?: string; date: string; signatureDataUrl?: string | null } | null;
};

const COMMON: BlockType[] = ["paragraph", "heading", "list", "callout", "table", "image", "pricing", "timeline", "signature", "page_break"];

export function DocumentEditor(props: EditorProps) {
  const { doc, brand, templates, locked, hasAi } = props;
  const [content, setContent] = useState(props.initialContent);
  const [title, setTitle] = useState(doc.title);
  const [templateValue, setTemplateValue] = useState(doc.templateValue);
  const [status, setStatus] = useState(doc.status);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [open, setOpen] = useState<Set<string>>(() => new Set(props.initialContent.sections.slice(0, 1).map((s) => s.id)));
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving" | "error">("saved");
  const dirty = useRef(false);
  const seq = useRef(0);

  const template = templates.find((t) => t.value === templateValue) ?? templates[0];
  const blockCtx: BlockCtx = useMemo(() => ({ documentTitle: title, packages: props.packages, disabled: locked }), [title, props.packages, locked]);

  const mutate = useCallback((fn: (d: DocumentContent) => void) => {
    setContent((c) => { const d = structuredClone(c); fn(d); return d; });
    dirty.current = true; setSaveState("dirty");
  }, []);

  const save = useCallback(async (quiet = false) => {
    if (locked) return;
    const mine = ++seq.current;
    setSaveState("saving");
    try {
      const [kind, id] = templateValue.split(":");
      const res = await saveDocumentAction({ id: doc.id, title, content, templateKey: kind === "sys" ? id : null, templateId: kind === "custom" ? id : null });
      if (mine !== seq.current) return;
      if (res.ok) { dirty.current = false; setSaveState("saved"); if (!quiet) toast.success("Saved."); }
      else { setSaveState("error"); toast.error(res.error); }
    } catch { setSaveState("error"); toast.error("We couldn't reach the server. Your changes are still here; try saving again."); }
  }, [content, doc.id, locked, templateValue, title]);

  // Autosave 2 seconds after the last change.
  useEffect(() => {
    if (!dirty.current || locked) return;
    const t = setTimeout(() => { void save(true); }, 2000);
    return () => clearTimeout(t);
  }, [content, title, templateValue, save, locked]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const allowed: BlockType[] = [...COMMON, ...(doc.type === "quotation" ? (["quotation"] as BlockType[]) : []), ...(doc.type === "seo_audit" ? (["audit_findings"] as BlockType[]) : [])];

  const setBlock = (si: number, bi: number, b: Block) => mutate((d) => { d.sections[si].blocks[bi] = b; });
  const statusLabel = { saved: "All changes saved", dirty: "Unsaved changes", saving: "Saving", error: "Not saved" }[saveState];

  const editorPane = (
    <div className={cn("space-y-5", tab !== "edit" && "hidden lg:block")}>
      {locked && (
        <div role="status" className="rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-warn">
          This document was {status} by the client, so it is locked. Duplicate it from the documents list to make a new version.
        </div>
      )}

      <section className="rounded-lg border border-line bg-surface p-4 shadow-soft">
        <h2 className="mb-3 text-sm font-semibold">{doc.type === "quotation" ? "Header" : "Cover"}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Labeled label="Title" className="sm:col-span-2"><input className={inputCls} value={content.cover.title} disabled={locked} onChange={(e) => mutate((d) => { d.cover.title = e.target.value; })} /></Labeled>
          <Labeled label="Subtitle" className="sm:col-span-2"><input className={inputCls} value={content.cover.subtitle} disabled={locked} onChange={(e) => mutate((d) => { d.cover.subtitle = e.target.value; })} /></Labeled>
          <Labeled label="Label above title"><input className={inputCls} value={content.cover.kicker} disabled={locked} onChange={(e) => mutate((d) => { d.cover.kicker = e.target.value; })} /></Labeled>
          <Labeled label="Reference"><input className={inputCls} value={content.cover.reference} disabled={locked} onChange={(e) => mutate((d) => { d.cover.reference = e.target.value; })} /></Labeled>
          <Labeled label="Prepared for"><input className={inputCls} value={content.cover.preparedFor} disabled={locked} onChange={(e) => mutate((d) => { d.cover.preparedFor = e.target.value; })} /></Labeled>
          <Labeled label="Date"><input type="date" className={inputCls} value={content.cover.date} disabled={locked} onChange={(e) => mutate((d) => { d.cover.date = e.target.value; })} /></Labeled>
        </div>
        <p className="mt-3 text-xs text-ink-faint">Your company name, logo, contact details and footer come from your brand kit{doc.frozen ? " as they were when this document was shared." : "."}</p>
      </section>

      {content.sections.map((s, si) => {
        const isOpen = open.has(s.id);
        return (
          <section key={s.id} className="rounded-lg border border-line bg-surface shadow-soft">
            <div className="flex items-center gap-2 border-b border-line px-3 py-2">
              <button type="button" aria-expanded={isOpen} aria-label={isOpen ? "Collapse section" : "Expand section"} onClick={() => setOpen((o) => { const n = new Set(o); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })}
                className="grid size-7 place-items-center rounded hover:bg-black/5"><ChevronDown className={cn("size-4 transition-transform", !isOpen && "-rotate-90")} /></button>
              <input className={`${inputCls} border-transparent bg-transparent font-semibold shadow-none`} value={s.title} aria-label="Section title" disabled={locked} onChange={(e) => mutate((d) => { d.sections[si].title = e.target.value; })} />
              {!locked && <MoveControls index={si} count={content.sections.length} label="section" onMove={(to) => mutate((d) => move(d.sections, si, to))} onRemove={() => mutate((d) => { d.sections.splice(si, 1); })} />}
            </div>
            {isOpen && (
              <div className="space-y-4 p-3">
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft">
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={s.hideTitle} disabled={locked} onChange={(e) => mutate((d) => { d.sections[si].hideTitle = e.target.checked; })} />Hide title in document</label>
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={s.pageBreakBefore} disabled={locked} onChange={(e) => mutate((d) => { d.sections[si].pageBreakBefore = e.target.checked; })} />Start on a new page</label>
                </div>
                {s.blocks.map((b, bi) => (
                  <div key={b.id} className="rounded-md border border-line/70 bg-paper/40 p-2.5">
                    <div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium uppercase tracking-wider text-ink-faint">{BLOCK_LABELS[b.type]}</span>
                      {!locked && <MoveControls index={bi} count={s.blocks.length} label="block" onMove={(to) => mutate((d) => move(d.sections[si].blocks, bi, to))} onRemove={() => mutate((d) => { d.sections[si].blocks.splice(bi, 1); })} />}</div>
                    <BlockEditor block={b} ctx={blockCtx} onChange={(nb) => setBlock(si, bi, nb)} />
                  </div>
                ))}
                {!locked && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Dropdown>
                      <DropdownTrigger className="inline-flex h-8 items-center gap-1 rounded-md border border-line-strong bg-surface px-2.5 text-sm hover:bg-paper"><Plus className="size-3.5" aria-hidden />Add block</DropdownTrigger>
                      <DropdownContent align="start" className="min-w-44">{allowed.map((t) => <DropdownItem key={t} onSelect={() => mutate((d) => { d.sections[si].blocks.push(emptyBlock(t)); })}>{BLOCK_LABELS[t]}</DropdownItem>)}</DropdownContent>
                    </Dropdown>
                    {hasAi && <AiMenu mode="generate" label="Generate with AI" text={s.blocks.map((b) => ("content" in b ? b.content : "items" in b && Array.isArray(b.items) ? (b.items as unknown[]).filter((x) => typeof x === "string").join("\n") : "")).join("\n").trim() || `${s.title} for ${content.cover.preparedFor}`}
                      documentTitle={title} onResult={(cmd, result) => mutate((d) => { d.sections[si].blocks.push(blockFromGenerated(cmd, result)); })} />}
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}

      {!locked && (
        <Button variant="secondary" onClick={() => mutate((d) => { const s = emptySection(); d.sections.push(s); setOpen((o) => new Set(o).add(s.id)); })}><FilePlus2 className="size-4" aria-hidden />Add section</Button>
      )}
    </div>
  );

  return (
    <div>
      <div className="sticky top-14 z-20 -mx-4 mb-5 border-b border-line bg-paper/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link href={props.backHref} aria-label="Back to list" className="grid size-8 place-items-center rounded-md hover:bg-black/5"><ArrowLeft className="size-4" /></Link>
          <input value={title} onChange={(e) => { setTitle(e.target.value); dirty.current = true; setSaveState("dirty"); }} disabled={locked} aria-label="Document name"
            className="min-w-0 flex-1 basis-40 rounded-md border border-transparent bg-transparent px-2 py-1 font-serif text-xl hover:border-line focus-visible:border-brand focus-visible:outline-none" />
          <DocStatusBadge status={status} />
          <span className="hidden items-center gap-1 text-xs text-ink-faint sm:flex" aria-live="polite">{saveState === "saving" && <Loader2 className="size-3 animate-spin" aria-hidden />}{statusLabel}</span>
          <select aria-label="Template" value={templateValue} disabled={locked} onChange={(e) => { setTemplateValue(e.target.value); dirty.current = true; setSaveState("dirty"); }}
            className="h-8 rounded-md border border-line-strong bg-surface px-2 text-sm">{templates.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
          {!locked && <Button size="sm" variant="secondary" onClick={() => save()} loading={saveState === "saving"}><Save className="size-4" aria-hidden />Save</Button>}
          <PdfButton url={`/api/documents/${doc.id}/pdf`} />
          {!locked && <SaveTemplateButton documentId={doc.id} beforeSave={() => save(true)} />}
          {!locked && <ShareDialog documentId={doc.id} initialUrl={doc.publicUrl} status={status} hasAi={hasAi} onShared={() => setStatus((s) => (s === "draft" ? "sent" : s))} />}
        </div>
        <div role="tablist" aria-label="Editor view" className="mt-2 flex gap-1 lg:hidden">
          {(["edit", "preview"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("flex-1 rounded-md px-3 py-1.5 text-sm", tab === t ? "bg-brand text-white" : "bg-black/5 text-ink-soft")}>{t === "edit" ? "Edit" : "Preview"}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,500px)_minmax(0,1fr)]">
        {editorPane}
        <div className={cn("min-w-0 lg:sticky lg:top-32 lg:max-h-[calc(100dvh-9rem)] lg:self-start lg:overflow-y-auto", tab !== "preview" && "hidden lg:block")}>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink-faint"><Undo2 className="hidden" />Live preview</p>
          <PreviewFrame>
            <DocumentRenderer content={content} brand={brand} template={template.config} meta={{ type: doc.type, acceptance: props.acceptance }} />
          </PreviewFrame>
        </div>
      </div>
    </div>
  );
}

function BlockEditor({ block, ctx, onChange }: { block: Block; ctx: BlockCtx; onChange: (b: Block) => void }) {
  switch (block.type) {
    case "paragraph": case "callout": return <TextBlockEditor block={block} ctx={ctx} onChange={onChange} />;
    case "heading": return <HeadingEditor block={block} ctx={ctx} onChange={onChange} />;
    case "list": return <ListEditor block={block} ctx={ctx} onChange={onChange} />;
    case "table": return <TableEditor block={block} ctx={ctx} onChange={onChange} />;
    case "image": return <ImageEditor block={block} ctx={ctx} onChange={onChange} />;
    case "pricing": return <PricingEditor block={block} ctx={ctx} onChange={onChange} />;
    case "timeline": return <TimelineEditor block={block} ctx={ctx} onChange={onChange} />;
    case "quotation": return <QuotationEditor block={block} disabled={ctx.disabled} onChange={onChange} />;
    case "audit_findings": return <AuditFindingsEditor block={block} disabled={ctx.disabled} onChange={onChange} />;
    case "signature": case "page_break": case "audit_summary": return <SimpleBlockEditor block={block} ctx={ctx} onChange={onChange} />;
  }
}

export { IconButton };

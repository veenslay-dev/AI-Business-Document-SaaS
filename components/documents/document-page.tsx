import { notFound } from "next/navigation";
import { DocumentEditor } from "@/components/documents/editor/document-editor";
import { requireWorkspace } from "@/lib/auth/session";
import { allows } from "@/lib/billing/plans";
import { fetchDocument, loadRenderData } from "@/lib/db/render";
import { listEditorTemplates, listPackages } from "@/lib/db/templates";
import type { DocType } from "@/lib/documents/templates";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/utils";

/** Server side loader shared by /proposals/[id], /quotations/[id] and /seo-audits/[id]. */
export async function DocumentEditorPage({ id, type, backHref }: { id: string; type: DocType; backHref: string }) {
  const { membership } = await requireWorkspace();
  const supabase = await createClient();
  const doc = await fetchDocument(supabase, membership.workspaceId, id);
  if (!doc || doc.type !== type) notFound();

  const [render, templates, packages, sub, accepted, feedback] = await Promise.all([
    loadRenderData(supabase, doc),
    listEditorTemplates(membership.workspaceId, type),
    listPackages(membership.workspaceId),
    supabase.from("subscriptions").select("plan").eq("workspace_id", membership.workspaceId).maybeSingle(),
    supabase.from("document_actions").select("metadata, created_at").eq("document_id", doc.id).eq("action", "accepted").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("document_actions").select("id, action, metadata, created_at").eq("document_id", doc.id).in("action", ["comment_added", "rejected"]).order("created_at", { ascending: false }).limit(5),
  ]);
  if (!render) {
    return <div role="alert" className="rounded-md border border-signal/30 bg-signal-soft px-4 py-3 text-sm text-[#7d2a16]">This document's content couldn't be read. Duplicate it from the list, or contact support.</div>;
  }

  const meta = (accepted.data?.metadata ?? {}) as { name?: string; designation?: string; signature?: string };
  const templateValue = doc.template_id ? `custom:${doc.template_id}` : `sys:${doc.template_key ?? ""}`;
  const aiConfigured = !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);

  const notes = (feedback.data ?? []).map((a) => {
    const m = (a.metadata ?? {}) as { comment?: string; reason?: string; name?: string };
    return { id: a.id, at: a.created_at, kind: a.action as string, text: (a.action === "rejected" ? m.reason : m.comment) ?? "", name: m.name ?? "" };
  });

  return (
    <>
    {notes.length > 0 && (
      <section aria-label="Client feedback" className="mb-5 rounded-lg border border-warn/30 bg-warn-soft p-4 text-sm">
        <h2 className="mb-2 font-semibold text-warn">{notes[0].kind === "rejected" ? "The client rejected this document" : "Client requested changes"}</h2>
        <ul className="space-y-2">{notes.map((n) => (
          <li key={n.id}><span className="text-xs text-ink-faint">{new Date(n.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}{n.name ? ` · ${n.name}` : ""}{n.kind === "rejected" ? " · rejected" : ""}</span>
            <p className="whitespace-pre-line">{n.text || "No comment left."}</p></li>))}</ul>
      </section>
    )}
    <DocumentEditor
      doc={{ id: doc.id, type, title: doc.title, status: doc.status, publicUrl: `${siteUrl()}/view/p/${doc.public_token}`, frozen: render.frozen, hasAcceptance: !!accepted.data,
        templateValue: templates.some((t) => t.value === templateValue) ? templateValue : templates[0].value }}
      initialContent={render.content} brand={render.brand} templates={templates}
      packages={packages.map((p) => ({ id: p.id, name: p.name, price: p.price, description: p.description, features: p.features }))}
      locked={doc.status === "accepted" || doc.status === "rejected"} hasAi={aiConfigured && allows(sub.data?.plan, "ai")} backHref={backHref}
      acceptance={accepted.data ? { name: meta.name ?? "", designation: meta.designation, date: accepted.data.created_at, signatureDataUrl: meta.signature ?? null } : null}
    />
    </>
  );
}

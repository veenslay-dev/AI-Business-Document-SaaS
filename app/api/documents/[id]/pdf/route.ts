import { NOINDEX_HEADER } from "@/lib/seo/robots";
import { NextResponse } from "next/server";
import { getActiveMembership, getUser } from "@/lib/auth/session";
import { documentToPdf } from "@/lib/db/pdf-document";
import { fetchDocument, loadRenderData } from "@/lib/db/render";
import { isPlatformAdmin } from "@/lib/auth/admin";
import { PDF_USER_MESSAGE, PdfError, pdfFileName } from "@/lib/pdf/render";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Authenticated PDF download for a document in the caller's active workspace. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  const membership = await getActiveMembership();
  if (!user || !membership) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const supabase = await createClient();
  const doc = await fetchDocument(supabase, membership.workspaceId, (await params).id);
  if (!doc) return NextResponse.json({ error: "This document no longer exists." }, { status: 404 });
  const render = await loadRenderData(supabase, doc);
  if (!render) return NextResponse.json({ error: "This document's content couldn't be read." }, { status: 422 });

  const { data: accepted } = await supabase.from("document_actions").select("metadata, created_at").eq("document_id", doc.id).eq("action", "accepted").order("created_at", { ascending: false }).limit(1).maybeSingle();
  const m = (accepted?.metadata ?? {}) as { name?: string; designation?: string; signature?: string };

  try {
    const pdf = await documentToPdf({ render, type: doc.type, title: doc.title, acceptance: accepted ? { name: m.name ?? "", designation: m.designation, date: accepted.created_at, signatureDataUrl: m.signature } : null });
    return new NextResponse(new Uint8Array(pdf), {
      headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${pdfFileName(doc.title)}"`, "cache-control": "private, no-store", "x-robots-tag": NOINDEX_HEADER },
    });
  } catch (e) {
    console.error("[pdf] route failed", e instanceof Error ? e.message : "unknown");
    const busy = e instanceof PdfError && e.code === "busy";
    return NextResponse.json({ error: busy ? "PDF generation is busy. Try again in a few seconds." : PDF_USER_MESSAGE + ((await isPlatformAdmin()) ? ` [${(e instanceof PdfError && e.detail ? e.detail : e instanceof Error ? e.message : "unknown").slice(0, 300)}]` : "") }, { status: busy ? 429 : 500 });
  }
}

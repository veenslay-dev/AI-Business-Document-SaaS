import { NOINDEX_HEADER } from "@/lib/seo/robots";
import { NextResponse } from "next/server";
import { documentToPdf } from "@/lib/db/pdf-document";
import { clientIp, getPublicDocument, hashIp } from "@/lib/db/public";
import { isBot } from "@/lib/public/access";
import { PDF_USER_MESSAGE, PdfError, pdfFileName } from "@/lib/pdf/render";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;
const MAX_DOWNLOADS_PER_HOUR = 60;

/** PDF of a shared document. Anyone with the link can download it; the download is logged. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const found = await getPublicDocument((await params).token);
  if (found === "invalid" || found.state !== "ok") return NextResponse.json({ error: "This link is not available." }, { status: 404 });
  // Link previews and crawlers never need a PDF, and their requests are not logged, so they must not reach the renderer.
  if (isBot(req.headers.get("user-agent"))) return NextResponse.json({ error: "This link is not available." }, { status: 403 });
  // Each PDF costs a browser launch, so one shared link can't be used to hammer the server.
  const admin = createAdminClient();
  const { count: recent } = await admin.from("document_actions").select("id", { count: "exact", head: true })
    .eq("document_id", found.doc.id).eq("action", "downloaded").gte("created_at", new Date(Date.now() - 3600_000).toISOString());
  if ((recent ?? 0) >= MAX_DOWNLOADS_PER_HOUR) return NextResponse.json({ error: "This document was downloaded a lot in the last hour. Try again later." }, { status: 429 });
  // Logged before rendering so that parallel requests are counted too.
  await admin.from("document_actions").insert({ document_id: found.doc.id, action: "downloaded", metadata: { ip: hashIp(clientIp(req.headers), found.doc.id) } });
  try {
    const pdf = await documentToPdf({ render: found.render, type: found.doc.type, title: found.doc.title, acceptance: found.acceptance });
    return new NextResponse(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${pdfFileName(found.doc.title)}"`, "cache-control": "private, no-store", "x-robots-tag": NOINDEX_HEADER } });
  } catch (e) {
    console.error("[pdf] route failed", e instanceof Error ? e.message : "unknown");
    const busy = e instanceof PdfError && e.code === "busy";
    return NextResponse.json({ error: busy ? "PDF generation is busy. Try again in a few seconds." : PDF_USER_MESSAGE }, { status: busy ? 429 : 500 });
  }
}

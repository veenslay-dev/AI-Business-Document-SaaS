import { NextResponse } from "next/server";
import { documentToPdf } from "@/lib/db/pdf-document";
import { clientIp, getPublicDocument, hashIp } from "@/lib/db/public";
import { isBot } from "@/lib/public/access";
import { PDF_USER_MESSAGE, PdfError, pdfFileName } from "@/lib/pdf/render";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

/** PDF of a shared document. Anyone with the link can download it; the download is logged. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const found = await getPublicDocument((await params).token);
  if (found === "invalid" || found.state !== "ok") return NextResponse.json({ error: "This link is not available." }, { status: 404 });
  try {
    const pdf = await documentToPdf({ render: found.render, type: found.doc.type, title: found.doc.title, acceptance: found.acceptance });
    if (!isBot(req.headers.get("user-agent"))) {
      await createAdminClient().from("document_actions").insert({ document_id: found.doc.id, action: "downloaded", metadata: { ip: hashIp(clientIp(req.headers), found.doc.id) } });
    }
    return new NextResponse(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${pdfFileName(found.doc.title)}"`, "cache-control": "private, no-store" } });
  } catch (e) {
    const busy = e instanceof PdfError && e.code === "busy";
    return NextResponse.json({ error: busy ? "PDF generation is busy. Try again in a few seconds." : PDF_USER_MESSAGE + (process.env.PDF_DEBUG === "1" && e instanceof PdfError && e.detail ? ` [${e.detail.slice(0, 300)}]` : "") }, { status: busy ? 429 : 500 });
  }
}

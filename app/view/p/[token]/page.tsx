import type { Metadata } from "next";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { DocumentRenderer } from "@/components/documents/document-renderer";
import { ResponsePanel } from "@/components/public/response-panel";
import { ViewTracker } from "@/components/public/view-tracker";
import { getPublicDocument } from "@/lib/db/public";
import { canRespond } from "@/lib/public/access";
import { formatDate, safeImageUrl } from "@/lib/documents/util";

export const metadata: Metadata = { title: "Shared document", robots: { index: false, follow: false, nocache: true }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

function Notice({ icon: Icon, title, children }: { icon: typeof Clock; title: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper p-6 text-center">
      <div className="max-w-md"><Icon className="mx-auto mb-4 size-10 text-ink-faint" aria-hidden /><h1 className="font-serif text-3xl">{title}</h1><p className="mt-2 text-ink-soft">{children}</p></div>
    </main>
  );
}

export default async function PublicDocumentPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { token } = await params;
  const preview = (await searchParams).preview === "1";
  const found = await getPublicDocument(token);

  if (found === "invalid") return <Notice icon={XCircle} title="This link isn't valid">Check that you copied the whole address, or ask the sender for a new link.</Notice>;
  if (found.state === "not_shared") return <Notice icon={Clock} title="This document isn't available">The sender hasn't shared it yet. Please check back later.</Notice>;
  if (found.state === "expired") {
    return <Notice icon={Clock} title="This document has expired">
      Contact {found.contact.name}{found.contact.email ? ` at ${found.contact.email}` : ""}{found.contact.phone ? ` or ${found.contact.phone}` : ""} to ask for an updated version.</Notice>;
  }

  const { doc, render, acceptance } = found;
  const noun = doc.type === "quotation" ? "quotation" : "proposal";
  const respondable = canRespond(doc.status, doc.type, found.state);
  const logo = safeImageUrl(render.brand.brand.logoUrl);

  return (
    <div className="min-h-dvh bg-[#eceae4]">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[860px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logo ? <img src={logo} alt={render.brand.company.name} className="h-7 max-w-32 object-contain" /> : null}
            <span className="truncate text-sm font-medium">{render.brand.company.name}</span>
          </div>
          <ResponsePanel token={token} canRespond={respondable} noun={noun} pdfUrl={`/api/public/${token}/pdf`} />
        </div>
      </header>

      <main className="mx-auto max-w-[860px] px-0 py-4 sm:px-4 sm:py-8">
        {doc.status === "accepted" && (
          <div role="status" className="mx-3 mb-4 flex items-start gap-2 rounded-md bg-ok-soft px-4 py-3 text-sm text-ok sm:mx-0"><CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{acceptance ? `Accepted by ${acceptance.name} on ${formatDate(acceptance.date)}.` : "This document has been accepted."}</span></div>
        )}
        {doc.status === "rejected" && <div role="status" className="mx-3 mb-4 rounded-md bg-signal-soft px-4 py-3 text-sm text-[#7d2a16] sm:mx-0">This {noun} was declined.</div>}
        <article className="overflow-hidden bg-white shadow-pop sm:rounded-md">
          <DocumentRenderer content={render.content} brand={render.brand} template={render.template} meta={{ type: doc.type, acceptance }} />
        </article>
        <p className="mt-6 px-4 text-center text-xs text-ink-faint">Questions? Contact {render.brand.company.name}{render.brand.company.email ? ` at ${render.brand.company.email}` : ""}.</p>
      </main>
      <ViewTracker token={token} enabled={!preview} />
    </div>
  );
}

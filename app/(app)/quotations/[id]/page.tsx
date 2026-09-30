import type { Metadata } from "next";
import { DocumentEditorPage } from "@/components/documents/document-page";

export const metadata: Metadata = { title: "Edit document" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <DocumentEditorPage id={(await params).id} type="quotation" backHref="/quotations" />;
}

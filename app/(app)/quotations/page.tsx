import type { Metadata } from "next";
import { DocumentListPage } from "@/components/documents/document-list-page";
export const metadata: Metadata = { title: "Quotations" };
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  return <DocumentListPage type="quotation" searchParams={await searchParams} />;
}

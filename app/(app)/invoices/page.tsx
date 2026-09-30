import type { Metadata } from "next";
import { DocumentListPage } from "@/components/documents/document-list-page";
export const metadata: Metadata = { title: "Invoices" };
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  return <DocumentListPage type="invoice" searchParams={await searchParams} />;
}

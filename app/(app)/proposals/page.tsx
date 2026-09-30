import type { Metadata } from "next";
import { DocumentListPage } from "@/components/documents/document-list-page";
export const metadata: Metadata = { title: "Proposals" };
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  return <DocumentListPage type="proposal" searchParams={await searchParams} />;
}

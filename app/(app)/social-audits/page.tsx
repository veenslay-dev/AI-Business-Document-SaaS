import type { Metadata } from "next";
import { DocumentListPage } from "@/components/documents/document-list-page";
export const metadata: Metadata = { title: "Social Media Audits" };
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  return <DocumentListPage type="social_audit" searchParams={await searchParams} />;
}

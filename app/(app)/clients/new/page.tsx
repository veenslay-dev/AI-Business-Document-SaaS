import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { ClientForm } from "@/components/clients/client-form";

export const metadata: Metadata = { title: "Add client" };
export default function NewClientPage() {
  return (<><PageHeader title="Add client" /><ClientForm /></>);
}

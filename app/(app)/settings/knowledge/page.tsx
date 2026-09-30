import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { KnowledgeManager, type KbItem } from "@/components/dashboard/knowledge-manager";
import { EmptyState } from "@/components/ui/empty-state";
import { requireWorkspace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { KB_TYPES } from "@/lib/validation/config";

export const metadata: Metadata = { title: "Knowledge base" };

export default async function KnowledgePage() {
  const { membership } = await requireWorkspace();
  const supabase = await createClient();
  const { data } = await supabase.from("knowledge_base_items").select("id, title, type, content").eq("workspace_id", membership.workspaceId).order("updated_at", { ascending: false }).limit(200);
  const items: KbItem[] = (data ?? []).map((r) => ({ id: r.id, title: r.title, type: ((KB_TYPES as readonly string[]).includes(r.type) ? r.type : "note") as KbItem["type"], content: r.content ?? "" }));
  return (
    <div className="max-w-3xl">
      <h2 className="text-lg font-semibold">Knowledge base</h2>
      <p className="mb-5 mt-1 text-sm text-ink-soft">Case studies, service descriptions, FAQs, pricing notes and testimonials. When the AI drafts a proposal or rewrites a section it looks here for entries that match, and only uses what you've written.</p>
      {items.length === 0 && <div className="mb-4"><EmptyState icon={BookOpen} title="Nothing here yet">Add a case study or a service description to make AI drafts sound like your business.</EmptyState></div>}
      <KnowledgeManager items={items} />
    </div>
  );
}

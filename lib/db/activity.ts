import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DocType } from "@/lib/documents/templates";

export type ActivityItem = {
  id: string; at: string; action: string; documentId: string; title: string; type: DocType; clientName: string | null;
  text: string; detail: string | null;
};

type Meta = { name?: string; comment?: string; email?: string; reason?: string };

function describeAction(action: string, m: Meta): { text: string; detail: string | null } {
  switch (action) {
    case "viewed": return { text: "was opened by the client", detail: null };
    case "downloaded": return { text: "was downloaded as a PDF", detail: null };
    case "accepted": return { text: `was accepted${m.name ? ` by ${m.name}` : ""}`, detail: null };
    case "rejected": return { text: "was rejected", detail: m.reason || m.comment || null };
    case "comment_added": return { text: "has a change request from the client", detail: m.comment ?? null };
    default: return { text: action, detail: null };
  }
}

/** Recent document events for a workspace, optionally limited to one client. Scoped by workspace and RLS. */
export async function listActivity(f: { workspaceId: string; clientId?: string; limit?: number; since?: string }): Promise<ActivityItem[]> {
  const supabase = await createClient();
  let docs = supabase.from("documents").select("id, title, type, clients(company_name)").eq("workspace_id", f.workspaceId).limit(500);
  if (f.clientId) docs = docs.eq("client_id", f.clientId);
  const { data: docRows } = await docs;
  if (!docRows?.length) return [];
  const byId = new Map(docRows.map((d) => [d.id, d]));

  let q = supabase.from("document_actions").select("id, action, metadata, created_at, document_id")
    .in("document_id", [...byId.keys()]).order("created_at", { ascending: false }).limit(f.limit ?? 30);
  if (f.since) q = q.gt("created_at", f.since);
  const { data } = await q;
  return (data ?? []).flatMap((a) => {
    const d = byId.get(a.document_id);
    if (!d) return [];
    const c = Array.isArray(d.clients) ? d.clients[0] : d.clients;
    const { text, detail } = describeAction(a.action, (a.metadata ?? {}) as Meta);
    return [{ id: a.id, at: a.created_at, action: a.action, documentId: d.id, title: d.title, type: d.type as DocType, clientName: c?.company_name ?? null, text, detail }];
  });
}

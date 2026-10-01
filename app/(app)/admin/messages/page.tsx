import Link from "next/link";
import { Inbox, Mail, Phone } from "lucide-react";
import { MessageStatusButton } from "@/components/admin/message-actions";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listAdminMessages } from "@/lib/db/admin";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";

const FILTERS = [["new", "New"], ["handled", "Handled"], ["all", "All"]] as const;

export default async function AdminMessagesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const raw = (await searchParams).status;
  const status = raw === "handled" || raw === "all" ? raw : "new";
  const messages = await listAdminMessages(status);
  return (
    <div>
      <div className="mb-5 inline-flex rounded-full border border-line-strong bg-surface p-1 text-sm shadow-soft" role="group" aria-label="Filter messages">
        {FILTERS.map(([v, l]) => <Link key={v} href={`/admin/messages?status=${v}`} aria-current={status === v ? "page" : undefined} className={cn("rounded-full px-4 py-1.5 font-medium", status === v ? "bg-brand text-white" : "text-ink-soft hover:text-ink")}>{l}</Link>)}
      </div>
      {messages.length === 0 ? <EmptyState icon={Inbox} title="Nothing here">Messages from the contact page and upgrade requests show up in this inbox.</EmptyState> : (
        <ul className="space-y-4">
          {messages.map((m) => (
            <li key={m.id} className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{m.name}{m.company ? <span className="font-normal text-ink-soft">, {m.company}</span> : null}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
                    <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1.5 hover:text-brand"><Mail className="size-3.5" aria-hidden />{m.email}</a>
                    {m.phone && <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5" aria-hidden />{m.phone}</span>}
                    <span>{timeAgo(m.created_at)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={m.topic === "upgrade" || m.topic === "custom" ? "brand" : "neutral"} className="capitalize">{m.topic}{m.plan_interest ? `: ${m.plan_interest}` : ""}</Badge>
                  <MessageStatusButton id={m.id} status={m.status === "handled" ? "handled" : "new"} />
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm">{m.message}</p>
              {m.workspace_id && <Link href={`/admin/workspaces/${m.workspace_id}`} className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">Open this workspace to change its plan</Link>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

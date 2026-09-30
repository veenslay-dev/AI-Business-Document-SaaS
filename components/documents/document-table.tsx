import Link from "next/link";
import { DocStatusBadge } from "@/components/ui/status";
import { DocumentRowActions } from "./row-actions";
import { documentHref, TYPE_LABEL, type DocumentRow } from "@/lib/db/documents";
import { formatMoney } from "@/lib/documents/quotation";
import { timeAgo } from "@/lib/time";

export function DocumentTable({ rows, canDelete, hideClient = false }: { rows: DocumentRow[]; canDelete: boolean; hideClient?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-soft">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line bg-paper/60 text-xs uppercase tracking-wider text-ink-faint">
          <tr>
            <th className="px-4 py-2.5 font-medium">Document</th>
            {!hideClient && <th className="px-4 py-2.5 font-medium">Client</th>}
            <th className="hidden px-4 py-2.5 font-medium md:table-cell">Type</th>
            <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Amount</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="hidden px-4 py-2.5 font-medium lg:table-cell">Updated</th>
            <th className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((d) => (
            <tr key={d.id} className="hover:bg-paper/50">
              <td className="max-w-64 px-4 py-3">
                <Link href={documentHref(d.type, d.id)} className="block truncate font-medium hover:underline">{d.title}</Link>
                {d.views > 0 && <span className="text-xs text-ink-faint">Viewed {d.views} time{d.views === 1 ? "" : "s"} · last {timeAgo(d.last_viewed_at)}</span>}
              </td>
              {!hideClient && <td className="px-4 py-3 text-ink-soft">{d.client_id ? <Link href={`/clients/${d.client_id}`} className="hover:underline">{d.client_name}</Link> : "No client"}</td>}
              <td className="hidden px-4 py-3 text-ink-soft md:table-cell">{TYPE_LABEL[d.type]}</td>
              <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">{d.total_amount != null ? formatMoney(Number(d.total_amount), d.currency ?? "INR") : <span className="text-ink-faint">-</span>}</td>
              <td className="px-4 py-3"><DocStatusBadge status={d.status} /></td>
              <td className="hidden px-4 py-3 text-ink-soft lg:table-cell">{timeAgo(d.updated_at)}</td>
              <td className="px-2 py-2"><DocumentRowActions id={d.id} href={documentHref(d.type, d.id)} canDelete={canDelete} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

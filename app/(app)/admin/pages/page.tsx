import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getOverrides, isIndexable } from "@/lib/seo/pages";
import { PAGES } from "@/lib/seo/registry";
import { formatDate } from "@/lib/documents/util";

export const dynamic = "force-dynamic";

export default async function AdminPagesList() {
  const overrides = await getOverrides();
  return (
    <div>
      <p className="mb-5 max-w-3xl text-sm text-ink-soft">Every public page is listed here. Open one to change its search title and description, canonical address, social image, whether search engines may index it, its heading and intro text, extra content, and its structured data (schema markup). Each page already has a canonical address that points at itself and schema markup built from its content.</p>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-[11px] uppercase tracking-wider text-ink-faint"><tr><th className="px-4 py-3">Page</th><th className="px-4 py-3">Search title</th><th className="px-4 py-3">Indexing</th><th className="px-4 py-3">Settings</th><th className="px-4 py-3 text-right">Last edited</th><th className="px-4 py-3" /></tr></thead>
          <tbody>
            {PAGES.map((p) => {
              const o = overrides[p.path] ?? null;
              const indexable = isIndexable(p.path, o);
              return (
                <tr key={p.path} className="border-b border-line last:border-0">
                  <td className="px-4 py-3"><p className="font-semibold">{p.name}</p><p className="text-xs text-ink-faint">{p.path}</p></td>
                  <td className="max-w-xs truncate px-4 py-3 text-ink-soft" title={o?.seo_title ?? p.title}>{o?.seo_title ?? p.title}</td>
                  <td className="px-4 py-3"><Badge tone={indexable ? "ok" : "warn"}>{indexable ? "Indexed" : "noindex"}</Badge></td>
                  <td className="px-4 py-3">{o ? <Badge tone="brand">Customised</Badge> : <span className="text-xs text-ink-faint">Built-in</span>}</td>
                  <td className="px-4 py-3 text-right text-ink-soft">{o?.updated_at ? formatDate(o.updated_at) : "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Link href={`/admin/pages/edit?path=${encodeURIComponent(p.path)}`} className="font-semibold text-brand hover:underline">Edit</Link>
                    <a href={p.path} target="_blank" rel="noopener" className="ml-4 inline-flex items-center gap-1 text-ink-soft hover:text-brand" aria-label={`View ${p.name}`}><ExternalLink className="size-3.5" aria-hidden />View</a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-ink-faint">Pages inside the app (dashboard, documents, settings) and shared document links are private and always marked noindex. They still carry a self-referencing canonical address.</p>
    </div>
  );
}

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { listAdminUsers } from "@/lib/db/admin";
import { timeAgo } from "@/lib/time";

const PER_PAGE = 25;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { users, total } = await listAdminUsers(page, PER_PAGE);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  return (
    <div>
      <p className="mb-4 text-sm text-ink-soft">{total} account{total === 1 ? "" : "s"}. The first one is the admin.</p>
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line bg-paper text-[11px] uppercase tracking-wider text-ink-faint"><tr><th className="px-4 py-2.5">Email</th><th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Email confirmed</th><th className="px-4 py-2.5">Joined</th><th className="px-4 py-2.5">Last sign-in</th></tr></thead>
          <tbody className="divide-y divide-line">
            {users.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-soft">No accounts found.</td></tr>}
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-brand-soft/30">
                <td className="px-4 py-3 font-medium">{u.email}</td><td className="px-4 py-3 text-ink-soft">{u.fullName || "-"}</td>
                <td className="px-4 py-3"><Badge tone={u.confirmed ? "ok" : "warn"}>{u.confirmed ? "Yes" : "No"}</Badge></td>
                <td className="px-4 py-3 text-ink-soft">{timeAgo(u.created_at)}</td><td className="px-4 py-3 text-ink-soft">{u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : "Never"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={`/admin/users?page=${page - 1}`} className="font-semibold text-brand hover:underline">Previous</Link> : <span />}
          <span className="text-ink-soft">Page {page} of {pages}</span>
          {page < pages ? <Link href={`/admin/users?page=${page + 1}`} className="font-semibold text-brand hover:underline">Next</Link> : <span />}
        </div>
      )}
    </div>
  );
}

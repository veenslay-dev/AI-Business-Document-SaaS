import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { TeamManager, type InviteView, type MemberView } from "@/components/team/team-manager";
import { requireWorkspace } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Team" };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const { user, membership } = await requireWorkspace();
  const supabase = await createClient();
  const canManage = can(membership.role, "team:manage");

  // Members come through RLS (only this workspace's roster). Emails need the auth admin API.
  const { data: rows } = await supabase.from("workspace_members").select("id, user_id, role, created_at").eq("workspace_id", membership.workspaceId).order("created_at");
  const ids = (rows ?? []).map((r) => r.user_id as string);
  const [{ data: profiles }, invites] = await Promise.all([
    ids.length ? supabase.from("profiles").select("user_id, full_name").in("user_id", ids) : Promise.resolve({ data: [] as { user_id: string; full_name: string | null }[] }),
    canManage ? supabase.from("workspace_invites").select("id, email, role, token").eq("workspace_id", membership.workspaceId).is("accepted_at", null) : Promise.resolve({ data: [] }),
  ]);
  const names = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));

  const admin = createAdminClient();
  const emails = new Map<string, string>();
  await Promise.all(ids.map(async (id) => { const { data } = await admin.auth.admin.getUserById(id); if (data.user?.email) emails.set(id, data.user.email); }));

  const members: MemberView[] = (rows ?? []).map((r) => ({
    id: r.id, name: names.get(r.user_id) || emails.get(r.user_id) || "Member", email: emails.get(r.user_id) ?? "", role: r.role as MemberView["role"], isYou: r.user_id === user.id,
  }));
  const inviteViews: InviteView[] = ((invites.data ?? []) as { id: string; email: string; role: string; token: string }[]).map((i) => ({ id: i.id, email: i.email, role: i.role, link: `${siteUrl()}/invite/${i.token}` }));

  return (
    <>
      <PageHeader title="Team" description="Everyone here shares the same clients, documents and brand kit." />
      <TeamManager members={members} invites={inviteViews} canManage={canManage} />
    </>
  );
}

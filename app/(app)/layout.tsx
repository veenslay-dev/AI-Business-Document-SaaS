import type { Metadata } from "next";
import { AppShell } from "@/components/dashboard/shell";
import { getMemberships, requireWorkspace } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { listActivity } from "@/lib/db/activity";
import { documentHref } from "@/lib/db/documents";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, membership } = await requireWorkspace();
  const memberships = await getMemberships();
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("full_name, notification_prefs, notifications_seen_at").eq("user_id", user.id).maybeSingle();
  const prefs = (profile?.notification_prefs ?? {}) as Record<string, boolean>;
  const PREF_FOR: Record<string, string> = { viewed: "document_viewed", accepted: "document_accepted", rejected: "document_accepted", comment_added: "changes_requested" };
  const activity = (await listActivity({ workspaceId: membership.workspaceId, limit: 15 }))
    .filter((a) => PREF_FOR[a.action] && prefs[PREF_FOR[a.action]] !== false)
    .slice(0, 10);
  const seen = profile?.notifications_seen_at ? new Date(profile.notifications_seen_at).getTime() : 0;

  return (
    <AppShell
      activeId={membership.workspaceId}
      workspaces={memberships.map((m) => ({ id: m.workspaceId, name: m.name, logoUrl: m.logoUrl, role: m.role }))}
      userName={profile?.full_name ?? user.email ?? "You"}
      userEmail={user.email ?? ""}
      isAdmin={await isPlatformAdmin()}
      unread={activity.filter((a) => new Date(a.at).getTime() > seen).length}
      notifications={activity.map((a) => ({ id: a.id, at: a.at, href: documentHref(a.type, a.documentId), title: a.title, text: a.text, detail: a.detail }))}
    >
      {children}
    </AppShell>
  );
}

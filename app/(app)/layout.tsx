import type { Metadata } from "next";
import { AppShell } from "@/components/dashboard/shell";
import { getMemberships, requireWorkspace } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, membership } = await requireWorkspace();
  const memberships = await getMemberships();
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();

  return (
    <AppShell
      activeId={membership.workspaceId}
      workspaces={memberships.map((m) => ({ id: m.workspaceId, name: m.name, logoUrl: m.logoUrl, role: m.role }))}
      userName={profile?.full_name ?? user.email ?? "You"}
      userEmail={user.email ?? ""}
    >
      {children}
    </AppShell>
  );
}

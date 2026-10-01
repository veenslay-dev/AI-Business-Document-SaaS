import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceRole } from "@/lib/permissions/roles";

export const ACTIVE_WORKSPACE_COOKIE = "docupro_ws";

export type Membership = {
  workspaceId: string;
  role: WorkspaceRole;
  name: string;
  slug: string;
  logoUrl: string | null;
  onboardingCompleted: boolean;
};

/** Verified user (validated against the auth server, not just the cookie). */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  // A paused account is treated as signed out straight away, without waiting for its token to expire.
  if (data.user.banned_until && new Date(data.user.banned_until).getTime() > Date.now()) return null;
  return data.user;
});

/** For sign-in pages: sends someone who is already signed in (and not paused) to the dashboard. */
export async function redirectIfSignedIn() {
  if (await getUser()) redirect("/dashboard");
}

/** All workspaces the user belongs to. RLS limits this to their own memberships. */
export const getMemberships = cache(async (): Promise<Membership[]> => {
  const user = await getUser();
  if (!user) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspace_members")
    .select("role, workspace:workspaces(id, name, slug, logo_url, onboarding_completed_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return (data ?? []).flatMap((row) => {
    const ws = Array.isArray(row.workspace) ? row.workspace[0] : row.workspace;
    if (!ws) return [];
    return [{
      workspaceId: ws.id,
      role: row.role as WorkspaceRole,
      name: ws.name,
      slug: ws.slug,
      logoUrl: ws.logo_url,
      onboardingCompleted: !!ws.onboarding_completed_at,
    }];
  });
});

/**
 * The active workspace. The cookie is only a preference: it is checked against
 * the user's real memberships on every request, so a forged value does nothing.
 */
export const getActiveMembership = cache(async (): Promise<Membership | null> => {
  const memberships = await getMemberships();
  if (memberships.length === 0) return null;
  const preferred = (await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value;
  return memberships.find((m) => m.workspaceId === preferred) ?? memberships[0];
});

/** For protected pages: redirects to login or onboarding as needed. */
export async function requireWorkspace(opts: { allowIncompleteOnboarding?: boolean } = {}) {
  const user = await getUser();
  if (!user) redirect("/login");
  const membership = await getActiveMembership();
  if (!membership) redirect("/onboarding");
  if (!membership.onboardingCompleted && !opts.allowIncompleteOnboarding) redirect("/onboarding");
  return { user, membership };
}

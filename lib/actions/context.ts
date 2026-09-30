import "server-only";
import { getActiveMembership, getUser } from "@/lib/auth/session";
import { can, type Permission } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";
import { fail } from "./result";

/**
 * Resolves who is acting and in which workspace. The workspace comes from the
 * verified membership, never from anything the browser sent.
 */
export async function actionContext(permission?: Permission) {
  const user = await getUser();
  const membership = await getActiveMembership();
  if (!user || !membership) return { ok: false as const, error: fail("Your session has expired. Please sign in again.") };
  if (permission && !can(membership.role, permission)) return { ok: false as const, error: fail("You don't have permission to do that.") };
  const supabase = await createClient();
  return { ok: true as const, user, membership, workspaceId: membership.workspaceId, supabase };
}

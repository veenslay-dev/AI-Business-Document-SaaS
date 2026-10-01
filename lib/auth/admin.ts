import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "./session";

/**
 * The platform admin is the first account ever created. ADMIN_EMAIL can name a second admin
 * (its address must be confirmed). Checked on the server on every request, never in the browser.
 */
export const firstUserId = cache(async (): Promise<string | null> => {
  try {
    const { data, error } = await createAdminClient().rpc("platform_first_user_id");
    return error ? null : ((data as string | null) ?? null);
  } catch { return null; }
});

export const isPlatformAdmin = cache(async (): Promise<boolean> => {
  const user = await getUser();
  if (!user) return false;
  const extra = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (extra && user.email?.toLowerCase() === extra && user.email_confirmed_at) return true;
  return (await firstUserId()) === user.id;
});

/** For admin pages and actions. Shows a plain 404 to everyone else so the area isn't advertised. */
export async function requirePlatformAdmin() {
  if (!(await isPlatformAdmin())) notFound();
  return (await getUser())!;
}

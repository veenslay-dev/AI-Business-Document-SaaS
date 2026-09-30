import "server-only";
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

/**
 * Creates the signed-in user's first workspace from the company name captured at signup.
 * Safe to call more than once and from concurrent requests: it never creates a second
 * workspace for a user who already has one. It doesn't touch cookies, so it can run while
 * a page renders (with a single workspace the app resolves it automatically).
 */
export async function createFirstWorkspace(): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;
  const supabase = await createClient();

  const hasMembership = async () => {
    const { count } = await supabase.from("workspace_members").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    return (count ?? 0) > 0;
  };
  if (await hasMembership()) return true;

  const name = String(user.user_metadata?.company_name ?? "").trim() || "My Company";
  const base = slugify(name) || "workspace";
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase.rpc("create_workspace", { p_name: name, p_slug: slug });
    if (!error && data) return true;
    if (error?.code !== "23505") return false; // only a taken slug is worth retrying
    // A concurrent request may have just created this user's workspace under the same slug.
    if (await hasMembership()) return true;
  }
  return false;
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { firstUserId, isPlatformAdmin } from "@/lib/auth/admin";
import { getUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import { fail, fromZod, GENERIC_ERROR, type ActionResult } from "./result";

const plan = z.enum(["free", "professional", "agency", "custom"]);
const role = z.enum(["owner", "admin", "member"]);
const uuid = z.string().uuid();
const password = z.string().min(8, "Use at least 8 characters").max(72, "Use 72 characters or fewer");
const done = () => { revalidatePath("/admin", "layout"); revalidatePath("/settings/subscription"); };

/** The admin account itself and the person using the panel can never be paused or deleted from here. */
async function protectedUser(id: string): Promise<string | null> {
  if ((await firstUserId()) === id) return "The platform admin account can't be changed from here.";
  if ((await getUser())?.id === id) return "You can't do this to your own account.";
  return null;
}

async function uniqueSlug(name: string): Promise<string> {
  const admin = createAdminClient();
  const base = slugify(name) || "workspace";
  for (let i = 0; i < 6; i++) {
    const slug = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { count } = await admin.from("workspaces").select("id", { count: "exact", head: true }).eq("slug", slug);
    if (!count) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  fullName: z.string().trim().min(2, "Enter their name").max(80),
  companyName: z.string().trim().min(2, "Enter a company name").max(80),
  password,
  plan,
});
export type CreateUserInput = z.input<typeof createUserSchema>;

/** Creates a confirmed account, a workspace and the chosen plan. The admin shares the password with the user. */
export async function adminCreateUserAction(input: CreateUserInput): Promise<ActionResult<{ userId: string; workspaceId: string }>> {
  if (!(await isPlatformAdmin())) return fail("Not allowed.");
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;
  const admin = createAdminClient();

  const { data: created, error } = await admin.auth.admin.createUser({ email: v.email, password: v.password, email_confirm: true, user_metadata: { full_name: v.fullName, company_name: v.companyName } });
  if (error || !created.user) return fail(/already|registered|exists/i.test(error?.message ?? "") ? "An account with that email already exists." : GENERIC_ERROR);
  const userId = created.user.id;

  const { data: ws, error: wsErr } = await admin.rpc("admin_create_workspace", { p_owner: userId, p_name: v.companyName, p_slug: await uniqueSlug(v.companyName) });
  if (wsErr || !ws) {
    console.error("[admin] workspace creation failed", wsErr?.message);
    await admin.auth.admin.deleteUser(userId); // don't leave a half-made account behind
    return fail(GENERIC_ERROR);
  }
  if (v.plan !== "free") await admin.from("subscriptions").update({ plan: v.plan, provider: "manual" }).eq("workspace_id", ws as string);
  done();
  return { ok: true, data: { userId, workspaceId: ws as string }, message: "Account created." };
}

/** Changes only the plan. Custom limits already set on the workspace are kept. */
export async function adminSetPlanAction(workspaceId: string, newPlan: string): Promise<ActionResult> {
  if (!(await isPlatformAdmin())) return fail("Not allowed.");
  if (!uuid.safeParse(workspaceId).success || !plan.safeParse(newPlan).success) return fail("That isn't a valid plan.");
  const { error } = await createAdminClient().from("subscriptions").upsert({ workspace_id: workspaceId, plan: newPlan, provider: "manual" }, { onConflict: "workspace_id" });
  if (error) return fail(GENERIC_ERROR);
  done();
  return { ok: true, message: "Plan changed." };
}

export async function adminSetUserPausedAction(userId: string, paused: boolean): Promise<ActionResult> {
  if (!(await isPlatformAdmin())) return fail("Not allowed.");
  if (!uuid.safeParse(userId).success) return fail("That account no longer exists.");
  const blocked = await protectedUser(userId); if (blocked) return fail(blocked);
  // About a hundred years. "none" lifts it.
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { ban_duration: paused ? "876000h" : "none" });
  if (error) return fail(GENERIC_ERROR);
  done();
  return { ok: true, message: paused ? "Account paused. They can't sign in." : "Account restored." };
}

export async function adminResetPasswordAction(userId: string, newPassword: string): Promise<ActionResult> {
  if (!(await isPlatformAdmin())) return fail("Not allowed.");
  if (!uuid.safeParse(userId).success) return fail("That account no longer exists.");
  const p = password.safeParse(newPassword); if (!p.success) return fail(p.error.issues[0].message);
  const blocked = await protectedUser(userId); if (blocked) return fail(blocked);
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password: p.data });
  if (error) return fail(GENERIC_ERROR);
  return { ok: true, message: "Password changed. Share it with them privately." };
}

/**
 * Deletes the account. Workspaces where they were the only member are deleted with all their documents and clients;
 * workspaces shared with others just lose this member.
 */
export async function adminDeleteUserAction(userId: string, confirmEmail: string): Promise<ActionResult> {
  if (!(await isPlatformAdmin())) return fail("Not allowed.");
  if (!uuid.safeParse(userId).success) return fail("That account no longer exists.");
  const blocked = await protectedUser(userId); if (blocked) return fail(blocked);
  const admin = createAdminClient();
  const { data: u } = await admin.auth.admin.getUserById(userId);
  if (!u.user) return fail("That account no longer exists.");
  if (u.user.email?.toLowerCase() !== confirmEmail.trim().toLowerCase()) return fail("Type the account's email address exactly to confirm.");

  const { data: mine } = await admin.from("workspace_members").select("workspace_id").eq("user_id", userId);
  for (const m of mine ?? []) {
    const { count } = await admin.from("workspace_members").select("id", { count: "exact", head: true }).eq("workspace_id", m.workspace_id);
    if ((count ?? 0) <= 1) await admin.from("workspaces").delete().eq("id", m.workspace_id);
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) { console.error("[admin] delete user failed", error.message); return fail(GENERIC_ERROR); }
  done();
  return { ok: true, message: "Account deleted." };
}

export async function adminCreateWorkspaceForUserAction(userId: string, name: string, newPlan: string): Promise<ActionResult> {
  if (!(await isPlatformAdmin())) return fail("Not allowed.");
  const n = z.string().trim().min(2, "Enter a company name").max(80).safeParse(name); if (!n.success) return fail(n.error.issues[0].message);
  if (!uuid.safeParse(userId).success || !plan.safeParse(newPlan).success) return fail("Something in that request isn't valid.");
  const admin = createAdminClient();
  const { data: ws, error } = await admin.rpc("admin_create_workspace", { p_owner: userId, p_name: n.data, p_slug: await uniqueSlug(n.data) });
  if (error || !ws) return fail(GENERIC_ERROR);
  if (newPlan !== "free") await admin.from("subscriptions").update({ plan: newPlan, provider: "manual" }).eq("workspace_id", ws as string);
  done();
  return { ok: true, message: "Workspace created." };
}

export async function adminAddMemberAction(workspaceId: string, email: string, newRole: string): Promise<ActionResult> {
  if (!(await isPlatformAdmin())) return fail("Not allowed.");
  const e = z.string().trim().toLowerCase().email("Enter a valid email address").safeParse(email); if (!e.success) return fail(e.error.issues[0].message);
  const r = role.safeParse(newRole);
  if (!uuid.safeParse(workspaceId).success || !r.success) return fail("Something in that request isn't valid.");
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = data?.users?.find((u) => u.email?.toLowerCase() === e.data);
  if (!user) return fail("No account has that email. Create the account first.");
  const { error } = await admin.from("workspace_members").insert({ workspace_id: workspaceId, user_id: user.id, role: r.data });
  if (error) return fail(error.code === "23505" ? "They are already in this workspace." : GENERIC_ERROR);
  done();
  return { ok: true, message: "Added to the workspace." };
}

export async function adminRemoveMemberAction(workspaceId: string, userId: string): Promise<ActionResult> {
  if (!(await isPlatformAdmin())) return fail("Not allowed.");
  if (!uuid.safeParse(workspaceId).success || !uuid.safeParse(userId).success) return fail("That member no longer exists.");
  const admin = createAdminClient();
  const { data: owners } = await admin.from("workspace_members").select("user_id").eq("workspace_id", workspaceId).eq("role", "owner");
  if ((owners ?? []).length === 1 && owners![0].user_id === userId) return fail("This is the only owner. Make someone else an owner first, or delete the account.");
  const { error } = await admin.from("workspace_members").delete().eq("workspace_id", workspaceId).eq("user_id", userId);
  if (error) return fail(GENERIC_ERROR);
  done();
  return { ok: true, message: "Removed from the workspace." };
}

export async function adminSetMemberRoleAction(workspaceId: string, userId: string, newRole: string): Promise<ActionResult> {
  if (!(await isPlatformAdmin())) return fail("Not allowed.");
  const r = role.safeParse(newRole);
  if (!uuid.safeParse(workspaceId).success || !uuid.safeParse(userId).success || !r.success) return fail("Something in that request isn't valid.");
  const admin = createAdminClient();
  if (r.data !== "owner") {
    const { data: owners } = await admin.from("workspace_members").select("user_id").eq("workspace_id", workspaceId).eq("role", "owner");
    if ((owners ?? []).length === 1 && owners![0].user_id === userId) return fail("This is the only owner. Make someone else an owner first.");
  }
  const { error } = await admin.from("workspace_members").update({ role: r.data }).eq("workspace_id", workspaceId).eq("user_id", userId);
  if (error) return fail(GENERIC_ERROR);
  done();
  return { ok: true, message: "Role updated." };
}

"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTIVE_WORKSPACE_COOKIE, getUser } from "@/lib/auth/session";
import { effectivePlan, enforcementOn } from "@/lib/billing/plans";
import { getEmailProvider } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviteSchema, type InviteInput } from "@/lib/validation/config";
import { uuid } from "@/lib/validation/crm";
import { siteUrl } from "@/lib/utils";
import { actionContext } from "./context";
import { fail, fromZod, GENERIC_ERROR, type ActionResult } from "./result";

export async function inviteMemberAction(input: InviteInput): Promise<ActionResult<{ link: string }>> {
  const ctx = await actionContext("team:manage");
  if (!ctx.ok) return ctx.error;
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);

  if (enforcementOn()) {
    const { data: sub } = await ctx.supabase.from("subscriptions").select("plan, limits, status").eq("workspace_id", ctx.workspaceId).maybeSingle();
    const limit = effectivePlan(sub).teamMembers;
    const [{ count: members }, { count: invites }] = await Promise.all([
      ctx.supabase.from("workspace_members").select("id", { count: "exact", head: true }).eq("workspace_id", ctx.workspaceId),
      ctx.supabase.from("workspace_invites").select("id", { count: "exact", head: true }).eq("workspace_id", ctx.workspaceId).is("accepted_at", null),
    ]);
    if (limit !== null && (members ?? 0) + (invites ?? 0) >= limit) return fail("Your plan's team limit is reached. Upgrade to add more people.");
  }

  const { data, error } = await ctx.supabase.from("workspace_invites")
    .insert({ workspace_id: ctx.workspaceId, email: parsed.data.email, role: parsed.data.role, invited_by: ctx.user.id }).select("token").single();
  if (error || !data) return fail(error?.code === "23505" ? "That person already has a pending invite." : GENERIC_ERROR);

  const link = `${siteUrl()}/invite/${data.token}`;
  await getEmailProvider().send({ to: parsed.data.email, subject: `You're invited to join ${ctx.membership.name}`, text: `Join ${ctx.membership.name} on Docuzumo: ${link}` });
  revalidatePath("/team");
  return { ok: true, data: { link }, message: "Invite created. Share the link with them." };
}

export async function revokeInviteAction(id: string): Promise<ActionResult> {
  const ctx = await actionContext("team:manage");
  if (!ctx.ok) return ctx.error;
  if (!uuid.safeParse(id).success) return fail("That invite no longer exists.");
  const { error } = await ctx.supabase.from("workspace_invites").delete().eq("id", id).eq("workspace_id", ctx.workspaceId);
  if (error) return fail(GENERIC_ERROR);
  revalidatePath("/team");
  return { ok: true, message: "Invite revoked." };
}

export async function removeMemberAction(memberId: string): Promise<ActionResult> {
  const ctx = await actionContext("team:manage");
  if (!ctx.ok) return ctx.error;
  if (!uuid.safeParse(memberId).success) return fail("That member no longer exists.");
  // RLS also refuses to touch owners; the role filter makes the intent explicit.
  const { data, error } = await ctx.supabase.from("workspace_members").delete().eq("id", memberId).eq("workspace_id", ctx.workspaceId).neq("role", "owner").select("id");
  if (error) return fail(GENERIC_ERROR);
  if (!data?.length) return fail("That member can't be removed.");
  revalidatePath("/team");
  return { ok: true, message: "Member removed." };
}

export async function changeRoleAction(memberId: string, role: "admin" | "member"): Promise<ActionResult> {
  const ctx = await actionContext("team:manage");
  if (!ctx.ok) return ctx.error;
  if (!uuid.safeParse(memberId).success || !["admin", "member"].includes(role)) return fail("That change isn't allowed.");
  const { data, error } = await ctx.supabase.from("workspace_members").update({ role }).eq("id", memberId).eq("workspace_id", ctx.workspaceId).neq("role", "owner").select("id");
  if (error) return fail(GENERIC_ERROR);
  if (!data?.length) return fail("That member's role can't be changed.");
  revalidatePath("/team");
  return { ok: true, message: "Role updated." };
}

/** Joins the signed-in user to the workspace from an invite. Only works if their sign-in email matches the invite. */
export async function acceptInviteAction(token: string): Promise<ActionResult> {
  const user = await getUser();
  if (!user?.email) return fail("Sign in to accept the invite.");
  if (!/^[a-f0-9]{40}$/.test(token)) return fail("This invite link isn't valid.");
  const admin = createAdminClient();
  const { data: invite } = await admin.from("workspace_invites").select("id, workspace_id, email, role, accepted_at").eq("token", token).maybeSingle();
  if (!invite || invite.accepted_at) return fail("This invite is no longer valid.");
  if (invite.email.toLowerCase() !== user.email.toLowerCase()) return fail(`This invite was sent to a different email address. Sign in as ${invite.email}.`);

  const { error } = await admin.from("workspace_members").insert({ workspace_id: invite.workspace_id, user_id: user.id, role: invite.role });
  if (error && error.code !== "23505") return fail(GENERIC_ERROR);
  await admin.from("workspace_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);
  (await cookies()).set(ACTIVE_WORKSPACE_COOKIE, invite.workspace_id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect("/dashboard");
}

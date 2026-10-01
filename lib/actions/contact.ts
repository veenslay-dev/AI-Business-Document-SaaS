"use server";

import { getMemberships, getUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { contactSchema, type ContactInput } from "@/lib/validation/contact";
import { fail, fromZod, GENERIC_ERROR, type ActionResult } from "./result";

const PER_EMAIL_PER_HOUR = 3;
const TOTAL_PER_HOUR = 40;

/** Stores a message from the public contact form or an upgrade request. Only the admin panel reads them. */
export async function submitContactAction(input: ContactInput): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const v = parsed.data;
  // A bot filled the hidden field. Pretend it worked.
  if (v.website) return { ok: true, message: "Thanks, we'll be in touch soon." };

  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - 3600_000).toISOString();
    const [mine, all] = await Promise.all([
      admin.from("contact_messages").select("id", { count: "exact", head: true }).eq("email", v.email).gte("created_at", since),
      admin.from("contact_messages").select("id", { count: "exact", head: true }).gte("created_at", since),
    ]);
    if ((mine.count ?? 0) >= PER_EMAIL_PER_HOUR || (all.count ?? 0) >= TOTAL_PER_HOUR) return fail("We've received several messages from you already. We'll reply soon.");

    // The workspace id comes from the browser, so it is only kept when the signed-in user really belongs to it.
    const user = await getUser();
    let workspaceId: string | null = null;
    if (user && v.workspaceId) workspaceId = (await getMemberships()).find((m) => m.workspaceId === v.workspaceId)?.workspaceId ?? null;

    const { error } = await admin.from("contact_messages").insert({
      name: v.name, email: v.email, company: v.company || null, phone: v.phone || null, topic: v.topic,
      plan_interest: v.plan, message: v.message, workspace_id: workspaceId, user_id: user?.id ?? null,
    });
    if (error) { console.error("[contact] insert failed", error.message); return fail(GENERIC_ERROR); }
    return { ok: true, message: "Thanks, we've got your message and will reply by email soon." };
  } catch (e) {
    console.error("[contact] failed", e instanceof Error ? e.message : "unknown");
    return fail(GENERIC_ERROR);
  }
}

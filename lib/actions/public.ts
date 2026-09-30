"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { clientIp, getPublicDocument, hashIp } from "@/lib/db/public";
import { canRespond } from "@/lib/public/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { acceptSchema, changesSchema, rejectSchema, type AcceptInput, type ChangesInput, type RejectInput } from "@/lib/validation/public";
import { fail, fromZod, GENERIC_ERROR, type ActionResult } from "./result";

const MAX_ACTIONS_PER_HOUR = 20;

/** Shared checks for every client response. Runs with the service role, so it verifies everything itself. */
async function prepare(token: string) {
  const found = await getPublicDocument(token);
  if (found === "invalid" || found.state === "not_shared") return { ok: false as const, error: fail("This link is not available.") };
  if (found.state === "expired") return { ok: false as const, error: fail("This document has expired. Contact the sender for a new one.") };
  const admin = createAdminClient();
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin.from("document_actions").select("id", { count: "exact", head: true }).eq("document_id", found.doc.id).in("action", ["accepted", "rejected", "comment_added"]).gte("created_at", since);
  if ((count ?? 0) >= MAX_ACTIONS_PER_HOUR) return { ok: false as const, error: fail("Too many responses were sent for this document. Try again later.") };
  return { ok: true as const, found, admin, ip: hashIp(clientIp(await headers()), found.doc.id) };
}

export async function acceptDocumentAction(token: string, input: AcceptInput): Promise<ActionResult> {
  const parsed = acceptSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const p = await prepare(token);
  if (!p.ok) return p.error;
  const { found, admin } = p;
  if (!canRespond(found.doc.status, found.doc.type, found.state)) return fail(found.doc.status === "accepted" ? "This document was already accepted." : "This document can't be accepted right now.");

  // Only move to accepted if it is still open, so two quick submissions can't both win.
  const { data, error } = await admin.from("documents").update({ status: "accepted" }).eq("id", found.doc.id).in("status", ["sent", "viewed"]).select("id");
  if (error) return fail(GENERIC_ERROR);
  if (!data?.length) return fail("This document was already answered.");
  await admin.from("document_actions").insert({
    document_id: found.doc.id, action: "accepted",
    metadata: { name: parsed.data.name, email: parsed.data.email, designation: parsed.data.designation, signature: parsed.data.signature, ip: p.ip },
  });
  revalidatePath("/", "layout");
  return { ok: true, message: `${found.doc.type === "quotation" ? "Quotation" : "Proposal"} accepted successfully.` };
}

export async function rejectDocumentAction(token: string, input: RejectInput): Promise<ActionResult> {
  const parsed = rejectSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const p = await prepare(token);
  if (!p.ok) return p.error;
  const { found, admin } = p;
  if (!canRespond(found.doc.status, found.doc.type, found.state)) return fail("This document can't be answered right now.");
  const { data, error } = await admin.from("documents").update({ status: "rejected" }).eq("id", found.doc.id).in("status", ["sent", "viewed"]).select("id");
  if (error) return fail(GENERIC_ERROR);
  if (!data?.length) return fail("This document was already answered.");
  await admin.from("document_actions").insert({ document_id: found.doc.id, action: "rejected", metadata: { reason: parsed.data.reason, name: parsed.data.name, ip: p.ip } });
  revalidatePath("/", "layout");
  return { ok: true, message: "Your response was sent." };
}

export async function requestChangesAction(token: string, input: ChangesInput): Promise<ActionResult> {
  const parsed = changesSchema.safeParse(input);
  if (!parsed.success) return fromZod(parsed.error);
  const p = await prepare(token);
  if (!p.ok) return p.error;
  const { found, admin } = p;
  if (!canRespond(found.doc.status, found.doc.type, found.state)) return fail("This document can't be commented on right now.");
  const { error } = await admin.from("document_actions").insert({ document_id: found.doc.id, action: "comment_added", metadata: { comment: parsed.data.comment, name: parsed.data.name, email: parsed.data.email, kind: "change_request", ip: p.ip } });
  if (error) return fail(GENERIC_ERROR);
  revalidatePath("/", "layout");
  return { ok: true, message: "Your request was sent. They'll get back to you." };
}

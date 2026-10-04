/** Rules for who can see a shared document. Pure, so they're easy to test. */

export const TOKEN_RE = /^[a-f0-9]{48}$/;

export type PublicState = "ok" | "not_shared" | "expired";

export function resolvePublicState(doc: { status: string; expires_at: string | null }, now = Date.now()): PublicState {
  if (doc.status === "draft") return "not_shared";
  if (doc.status === "expired") return "expired";
  if (doc.expires_at && new Date(doc.expires_at).getTime() < now && !["accepted", "rejected"].includes(doc.status)) return "expired";
  return "ok";
}

/** Statuses from which a client can still respond. */
const RESPONDABLE = ["sent", "viewed"] as const;
export const canRespond = (status: string, type: string, state: PublicState) =>
  state === "ok" && (RESPONDABLE as readonly string[]).includes(status) && (type === "proposal" || type === "quotation");

const BOTS = /bot|crawler|spider|preview|slurp|facebookexternalhit|whatsapp|telegram|discord|skype|linkedin|embedly|curl|wget|headless/i;
export const isBot = (ua: string | null | undefined) => !ua || BOTS.test(ua);

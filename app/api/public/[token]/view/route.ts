import { NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, hashIp } from "@/lib/db/public";
import { TOKEN_RE, isBot, resolvePublicState } from "@/lib/public/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const DEDUPE_MINUTES = 10;

const bodySchema = z.object({ viewId: z.string().uuid().optional(), seconds: z.number().min(0).max(4 * 3600).optional() });

/**
 * Records that a client opened a shared document, and later how long the page stayed in view.
 * Stores a hashed IP and the user agent only. Link-preview bots and owner previews are skipped.
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) return NextResponse.json({ ok: false }, { status: 404 });
  const body = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ ok: false }, { status: 400 });

  const admin = createAdminClient();
  const { data: doc } = await admin.from("documents").select("id, status, expires_at").eq("public_token", token).maybeSingle();
  if (!doc) return NextResponse.json({ ok: false }, { status: 404 });
  if (resolvePublicState(doc) !== "ok") return NextResponse.json({ ok: false }, { status: 410 });

  // Duration update for an existing view.
  if (body.data.viewId) {
    if (typeof body.data.seconds === "number") {
      await admin.from("document_views").update({ duration_seconds: Math.round(body.data.seconds) }).eq("id", body.data.viewId).eq("document_id", doc.id);
    }
    return NextResponse.json({ ok: true });
  }

  const ua = req.headers.get("user-agent");
  if (isBot(ua)) return NextResponse.json({ ok: true, skipped: true });

  const ipHash = hashIp(clientIp(req.headers), doc.id);
  const since = new Date(Date.now() - DEDUPE_MINUTES * 60_000).toISOString();
  const { data: recent } = await admin.from("document_views").select("id").eq("document_id", doc.id).eq("ip_hash", ipHash).gte("viewed_at", since).order("viewed_at", { ascending: false }).limit(1).maybeSingle();
  if (recent) return NextResponse.json({ ok: true, viewId: recent.id });

  const { data: view } = await admin.from("document_views").insert({ document_id: doc.id, ip_hash: ipHash, user_agent: (ua ?? "").slice(0, 300) }).select("id").single();
  await admin.from("document_actions").insert({ document_id: doc.id, action: "viewed", metadata: { mobile: /mobile|android|iphone/i.test(ua ?? "") } });
  if (doc.status === "sent") await admin.from("documents").update({ status: "viewed" }).eq("id", doc.id).eq("status", "sent");
  return NextResponse.json({ ok: true, viewId: view?.id });
}

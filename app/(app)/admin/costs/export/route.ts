import { NOINDEX_HEADER } from "@/lib/seo/robots";
import { NextResponse } from "next/server";
import { isPlatformAdmin } from "@/lib/auth/admin";
import { csvCell, getAiCosts, parsePeriod } from "@/lib/db/admin-costs";

export const runtime = "nodejs";

/** AI spend per user as a spreadsheet. Admin only. */
export async function GET(req: Request) {
  if (!(await isPlatformAdmin())) return new NextResponse("Not found", { status: 404 });
  const period = parsePeriod(new URL(req.url).searchParams.get("period") ?? undefined);
  const { byUser, summary } = await getAiCosts(period);
  const lines = [
    ["Email", "Name", "Workspaces", "AI actions", "Tokens", "Spend (INR)", "Per action (INR)", "Share of spend (%)", "Plan price per month (INR)"].map(csvCell).join(","),
    ...byUser.map((u) => [u.email, u.name, u.workspaces.map((w) => w.name).join("; "), u.calls, u.tokens, u.costInr.toFixed(2), u.avgInr.toFixed(2), (u.share * 100).toFixed(1), u.planPriceInr].map(csvCell).join(",")),
    ["Total", "", "", summary.calls, summary.tokens, summary.costInr.toFixed(2), summary.avgInr.toFixed(2), "100", ""].map(csvCell).join(","),
  ];
  return new NextResponse(lines.join("\r\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="ai-spend-${period}.csv"`, "cache-control": "private, no-store", "x-robots-tag": NOINDEX_HEADER },
  });
}

import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { PRODUCT_NAME } from "@/components/ui/logo";
import { getOverride } from "@/lib/seo/pages";
import { PAGE_BY_PATH } from "@/lib/seo/registry";
import { siteUrl } from "@/lib/utils";

export const runtime = "nodejs";

const KICKER: Record<string, string> = { home: "Client document software", pricing: "Plans and pricing", about: "About", contact: "Contact", legal: "Policies", auth: PRODUCT_NAME, templates: "Templates", template: "Free template", tool: "SEO audit tool" };

/**
 * A 1200 by 630 share card for a public page. Only pages we list can be drawn and the words come from our own page
 * settings, never from the request, so the route cannot be used to put arbitrary text under our brand.
 */
export async function GET(req: Request) {
  const requested = new URL(req.url).searchParams.get("path") ?? "/";
  const def = PAGE_BY_PATH[requested] ?? PAGE_BY_PATH["/"];
  const o = await getOverride(def.path);
  const title = (o?.heading?.trim() || def.heading || def.title).slice(0, 110);
  const logo = `data:image/png;base64,${(await readFile(path.join(process.cwd(), "public/logo.png"))).toString("base64")}`;
  const host = siteUrl().replace(/^https?:\/\//, "");
  const size = title.length > 70 ? 54 : title.length > 40 ? 64 : 76;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ffffff", color: "#0f1b33", padding: "64px 72px", borderBottom: "18px solid #dc1c26" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={300} height={74} alt="" />
          <div style={{ display: "flex", fontSize: 26, color: "#dc1c26", fontWeight: 700 }}>{KICKER[def.kind]}</div>
        </div>
        <div style={{ display: "flex", fontSize: size, lineHeight: 1.1, fontWeight: 700, letterSpacing: -1 }}>{title}</div>
        <div style={{ display: "flex", fontSize: 28, color: "#4b5565" }}>{host}</div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}

import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const alt = "PrioDraft: create once, brand everything, close more clients";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logo = `data:image/png;base64,${(await readFile(path.join(process.cwd(), "public/logo.png"))).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ffffff", color: "#0f1b33", padding: 72, borderBottom: "18px solid #dc1c26" }}>
        <img src={logo} width={344} height={85} alt="" />
        <div style={{ display: "flex", flexDirection: "column", fontSize: 72, lineHeight: 1.1, fontWeight: 700 }}>
          <span>Create once.</span><span>Brand everything.</span><span style={{ color: "#dc1c26" }}>Close more clients.</span>
        </div>
        <div style={{ fontSize: 28, color: "#4b5565" }}>Branded proposals, quotations, invoices and SEO audits</div>
      </div>
    ),
    size,
  );
}

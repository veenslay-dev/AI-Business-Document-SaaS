import { ImageResponse } from "next/og";

export const alt = "PrioDraft: create once, brand everything, close more clients";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#5a0b10", color: "#fff", padding: 72 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 32, fontWeight: 600 }}>
          <div style={{ width: 44, height: 44, borderRadius: 8, background: "#dc1c26", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>P</div>PrioDraft
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 68, lineHeight: 1.1 }}>
          <span>Create once.</span><span>Brand everything.</span><span style={{ color: "#ff8a8f" }}>Close more clients.</span>
        </div>
        <div style={{ fontSize: 28, opacity: 0.75 }}>Branded proposals, quotations and SEO audits</div>
      </div>
    ),
    size,
  );
}

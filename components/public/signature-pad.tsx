"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

const W = 480, H = 150;

/** Draw or type a signature. Emits a PNG data URL, or null when empty. */
export function SignaturePad({ onChange, name }: { onChange: (dataUrl: string | null) => void; name: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [drawEmpty, setDrawEmpty] = useState(true);
  const empty = mode === "type" ? !name.trim() : drawEmpty;

  const ctx = () => {
    const c = canvas.current!.getContext("2d")!;
    c.lineWidth = 2.5; c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = "#111";
    return c;
  };
  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const clear = () => { ctx().clearRect(0, 0, W, H); setDrawEmpty(true); onChange(null); };

  // Typed mode renders the name in a script style onto the same canvas.
  useEffect(() => {
    if (mode !== "type") return;
    const c = ctx(); c.clearRect(0, 0, W, H);
    if (!name.trim()) { onChange(null); return; }
    c.fillStyle = "#111"; c.font = 'italic 46px "Brush Script MT", "Segoe Script", "Snell Roundhand", cursive';
    c.textBaseline = "middle"; c.fillText(name.trim().slice(0, 30), 16, H / 2, W - 32);
    onChange(canvas.current!.toDataURL("image/png"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, name]);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <div role="tablist" aria-label="Signature method" className="flex gap-1 text-xs">
          {(["draw", "type"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); if (m === "draw") clear(); }}
              className={cn("rounded px-2 py-1", mode === m ? "bg-brand text-white" : "bg-black/5 text-ink-soft")}>{m === "draw" ? "Draw" : "Type my name"}</button>
          ))}
        </div>
        {mode === "draw" && <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink"><Eraser className="size-3.5" aria-hidden />Clear</button>}
      </div>
      <canvas ref={canvas} width={W} height={H} aria-label="Signature area" className={cn("w-full touch-none rounded-md border border-line-strong bg-white", mode === "draw" ? "cursor-crosshair" : "cursor-default")}
        onPointerDown={(e) => { if (mode !== "draw") return; e.currentTarget.setPointerCapture(e.pointerId); drawing.current = true; const p = point(e); const c = ctx(); c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + 0.1, p.y + 0.1); c.stroke(); }}
        onPointerMove={(e) => { if (!drawing.current) return; const p = point(e); const c = ctx(); c.lineTo(p.x, p.y); c.stroke(); }}
        onPointerUp={() => { if (!drawing.current) return; drawing.current = false; setDrawEmpty(false); onChange(canvas.current!.toDataURL("image/png")); }} />
      {empty && <p className="mt-1 text-xs text-ink-faint">{mode === "draw" ? "Sign with your mouse or finger." : "Enter your full name above and it will appear here."}</p>}
    </div>
  );
}

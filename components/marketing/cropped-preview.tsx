"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DOC_WIDTH = 820;

/** Shows the top of a real rendered document, scaled to its container and cropped to a fixed height. */
export function CroppedPreview({ children, height, className, label }: { children: React.ReactNode; height: number; className?: string; label: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / DOC_WIDTH);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outer} role="img" aria-label={label} className={cn("relative min-w-0 max-w-full overflow-hidden bg-white shadow-pop ring-1 ring-black/5", className)} style={{ height: height * scale }}>
      <div aria-hidden className="pointer-events-none select-none" style={{ width: DOC_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
}

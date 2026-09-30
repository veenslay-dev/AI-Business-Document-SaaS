"use client";

import { useEffect, useRef, useState } from "react";

const DOC_WIDTH = 820;

/** Renders children at the document's real width and scales them to fit the column, so the preview matches the PDF layout. */
export function PreviewFrame({ children }: { children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = outer.current; const inn = inner.current;
    if (!el || !inn) return;
    const measure = () => {
      const s = Math.min(1, el.clientWidth / DOC_WIDTH);
      setScale(s);
      setHeight(inn.offsetHeight * s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el); ro.observe(inn);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className="w-full overflow-hidden rounded-md bg-white shadow-pop ring-1 ring-line" style={{ height: height || undefined }}>
      <div ref={inner} style={{ width: DOC_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
}

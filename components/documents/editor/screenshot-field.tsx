"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { uploadBrandAssetAction } from "@/lib/actions/workspace";

/** Upload one screenshot. Nothing is shown in the document unless an image is attached. */
export function ScreenshotField({ value, onChange, disabled, label = "Screenshot" }: { value?: string; onChange: (url: string) => void; disabled?: boolean; label?: string }) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function upload(f: File) {
    setBusy(true);
    try {
      const fd = new FormData(); fd.set("kind", "doc_image"); fd.set("file", f);
      const res = await uploadBrandAssetAction(fd);
      if (res.ok && res.data) onChange(res.data.url); else if (!res.ok) toast.error(res.error);
    } catch { toast.error("The upload failed. Check your connection and try again."); }
    setBusy(false);
  }
  return (
    <div className="flex items-center gap-2">
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label={`Upload ${label.toLowerCase()}`} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
      {value ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-10 w-16 rounded border border-line object-cover" />
          <button type="button" disabled={disabled} onClick={() => onChange("")} className="inline-flex items-center gap-1 text-xs text-signal hover:underline disabled:opacity-40"><X className="size-3" aria-hidden />Remove</button>
        </>
      ) : (
        <button type="button" disabled={busy || disabled} onClick={() => file.current?.click()} className="inline-flex items-center gap-1 rounded-md border border-dashed border-line-strong px-2.5 py-1.5 text-xs text-ink-soft hover:bg-paper disabled:opacity-50"><ImagePlus className="size-3.5" aria-hidden />{busy ? "Uploading" : `Attach ${label.toLowerCase()}`}</button>
      )}
    </div>
  );
}

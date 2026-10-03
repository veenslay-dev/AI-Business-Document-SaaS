"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadBrandAssetAction } from "@/lib/actions/workspace";
import type { AssetKind } from "@/lib/validation/brand";

export function AssetUploader({
  kind, label, hint, value, onUploaded, dark = false,
}: {
  kind: AssetKind; label: string; hint?: string; value: string | null; onUploaded?: (url: string) => void; dark?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("file", file);
    start(async () => {
      try {
        const res = await uploadBrandAssetAction(fd);
        if (res.ok && res.data) { setUrl(res.data.url); onUploaded?.(res.data.url); }
        else if (!res.ok) setError(res.error);
      } catch {
        setError("The upload failed. Check your connection and try again.");
      }
      if (input.current) input.current.value = "";
    });
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-3">
        <div className={`grid h-16 w-28 shrink-0 place-items-center overflow-hidden rounded-md border border-dashed border-line-strong ${dark ? "bg-brand" : "bg-white"}`}>
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={label} className="max-h-14 max-w-24 object-contain" />
          ) : (
            <ImagePlus className={`size-5 ${dark ? "text-white/60" : "text-ink-faint"}`} aria-hidden />
          )}
        </div>
        <div>
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" id={`upload-${kind}`} onChange={onChange} />
          <Button type="button" variant="secondary" size="sm" loading={pending} onClick={() => input.current?.click()}>
            {url ? "Replace" : "Upload"}
          </Button>
          <p className="mt-1 text-xs text-ink-faint">{hint ?? "PNG, JPG or WebP, up to 2 MB."}</p>
        </div>
      </div>
      {error && <p role="alert" className="text-xs text-signal">{error}</p>}
    </div>
  );
}

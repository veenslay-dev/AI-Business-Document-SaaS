"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Downloads a PDF through fetch so a failure shows a message instead of saving an error page as a file. */
export function PdfButton({ url, label = "PDF", variant = "secondary" }: { url: string; label?: string; variant?: "secondary" | "primary" | "ghost" }) {
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(body?.error ?? "We couldn't generate the PDF right now. Try again in a moment.");
        return;
      }
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "document.pdf";
      const href = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = href; a.download = name; document.body.append(a); a.click(); a.remove();
      URL.revokeObjectURL(href);
    } catch { toast.error("We couldn't reach the server. Check your connection and try again."); }
    finally { setBusy(false); }
  }
  return <Button size="sm" variant={variant} loading={busy} onClick={download}><Download className="size-4" aria-hidden />{label}</Button>;
}

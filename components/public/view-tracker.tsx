"use client";

import { useEffect } from "react";

/**
 * Tells the server the document was opened, then reports how long the tab was visible.
 * Nothing but a hashed IP and the user agent is stored server side.
 */
export function ViewTracker({ token, enabled }: { token: string; enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    let viewId: string | null = null;
    let visibleMs = 0;
    let since = document.visibilityState === "visible" ? Date.now() : 0;
    const url = `/api/public/${token}/view`;

    fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: "{}", keepalive: true })
      .then((r) => (r.ok ? r.json() : null)).then((j) => { viewId = j?.viewId ?? null; }).catch(() => undefined);

    const report = () => {
      if (!viewId) return;
      const total = (visibleMs + (since ? Date.now() - since : 0)) / 1000;
      navigator.sendBeacon(url, new Blob([JSON.stringify({ viewId, seconds: Math.round(total) })], { type: "application/json" }));
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") { if (since) { visibleMs += Date.now() - since; since = 0; } report(); }
      else since = Date.now();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", report);
    return () => { document.removeEventListener("visibilitychange", onVis); window.removeEventListener("pagehide", report); };
  }, [token, enabled]);
  return null;
}

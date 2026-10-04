"use client";

import { useEffect } from "react";

/**
 * Loads the brand fonts a sample document uses (they come from Google Fonts) once the browser is idle, instead of
 * as render-blocking stylesheets in the middle of the page. Until they arrive the sample shows a system font.
 */
export function DeferredFonts({ hrefs }: { hrefs: string[] }) {
  const key = hrefs.join("|");
  useEffect(() => {
    const list = key ? key.split("|") : [];
    const add = () => {
      for (const href of list) {
        if (document.head.querySelector(`link[rel="stylesheet"][href="${href}"]`)) continue;
        const link = document.createElement("link");
        link.rel = "stylesheet"; link.href = href;
        document.head.appendChild(link);
      }
    };
    if ("requestIdleCallback" in window) { const id = window.requestIdleCallback(add, { timeout: 4000 }); return () => window.cancelIdleCallback(id); }
    const t = setTimeout(add, 1500);
    return () => clearTimeout(t);
  }, [key]);
  return null;
}

import "server-only";
import { createRequire } from "node:module";
import type { ReactElement } from "react";

/**
 * Renders a React element to static HTML for the PDF pipeline.
 *
 * Next.js refuses a static `import "react-dom/server"` inside app-router code. This loads
 * Node's own copy at runtime instead. The document renderer is pure (no hooks or context),
 * so elements created by the app's React are rendered correctly by that copy.
 */
export function renderToStaticMarkup(element: ReactElement): string {
  const load = createRequire(`${process.cwd()}/package.json`);
  const mod = load("react-dom/server") as { renderToStaticMarkup: (e: ReactElement) => string };
  return mod.renderToStaticMarkup(element);
}

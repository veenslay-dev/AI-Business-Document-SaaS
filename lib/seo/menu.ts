import { AUDIT_LANDING } from "./audit-landing";
import { TEMPLATE_PAGES } from "./templates";

export type MenuItem = { name: string; path: string };

/** The links under Templates in the site menu. The audit report generator sits next to the SEO proposal, since the two go together. */
export function templateMenu(): MenuItem[] {
  const items = TEMPLATE_PAGES.map((t) => ({ name: t.name, path: t.path }));
  return [items[0], { name: AUDIT_LANDING.name, path: AUDIT_LANDING.path }, ...items.slice(1)];
}

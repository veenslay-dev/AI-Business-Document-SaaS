import {
  LayoutDashboard, Users, FolderKanban, FileText, Receipt, SearchCheck, LayoutTemplate, Palette, UsersRound, Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; ready: boolean };

/**
 * `ready: false` items are hidden until their phase ships, so the sidebar
 * never links to a page that doesn't exist.
 */
export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ready: true },
  { href: "/clients", label: "Clients", icon: Users, ready: false },
  { href: "/projects", label: "Projects", icon: FolderKanban, ready: false },
  { href: "/proposals", label: "Proposals", icon: FileText, ready: false },
  { href: "/quotations", label: "Quotations", icon: Receipt, ready: false },
  { href: "/seo-audits", label: "SEO Audits", icon: SearchCheck, ready: false },
  { href: "/templates", label: "Templates", icon: LayoutTemplate, ready: false },
  { href: "/brand-kit", label: "Brand Kit", icon: Palette, ready: true },
  { href: "/team", label: "Team", icon: UsersRound, ready: false },
  { href: "/settings", label: "Settings", icon: Settings, ready: true },
];

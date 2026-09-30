import {
  LayoutDashboard, Users, FolderKanban, FileText, Receipt, SearchCheck, Megaphone, LayoutTemplate, Palette, UsersRound, Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; ready: boolean };

/**
 * `ready: false` items are hidden until their phase ships, so the sidebar
 * never links to a page that doesn't exist.
 */
export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ready: true },
  { href: "/clients", label: "Clients", icon: Users, ready: true },
  { href: "/projects", label: "Projects", icon: FolderKanban, ready: true },
  { href: "/proposals", label: "Proposals", icon: FileText, ready: true },
  { href: "/quotations", label: "Quotations", icon: Receipt, ready: true },
  { href: "/seo-audits", label: "SEO Audits", icon: SearchCheck, ready: true },
  { href: "/social-audits", label: "Social Audits", icon: Megaphone, ready: true },
  { href: "/templates", label: "Templates", icon: LayoutTemplate, ready: true },
  { href: "/brand-kit", label: "Brand Kit", icon: Palette, ready: true },
  { href: "/team", label: "Team", icon: UsersRound, ready: true },
  { href: "/settings", label: "Settings", icon: Settings, ready: true },
];

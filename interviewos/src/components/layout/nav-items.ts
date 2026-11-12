import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  ListFilter,
  GitFork,
  Network,
  Code2,
  LayoutDashboard,
  Library,
  MessagesSquare,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Messages } from "@/lib/i18n";

export interface NavItem {
  href: string;
  key: keyof Messages["common"]["nav"];
  icon: LucideIcon;
  shortcut?: string;
}

export const MAIN_NAV: NavItem[] = [
  { href: "/", key: "dashboard", icon: LayoutDashboard, shortcut: "G D" },
  { href: "/learn", key: "learn", icon: BookOpen, shortcut: "G L" },
  { href: "/roadmap", key: "roadmap", icon: GitFork, shortcut: "G R" },
  { href: "/practice", key: "practice", icon: Code2, shortcut: "G P" },
  { href: "/practice/bank", key: "bank", icon: ListFilter, shortcut: "G B" },
  { href: "/practice/system-design", key: "systemDesign", icon: Network, shortcut: "G Y" },
  { href: "/interviews", key: "interviews", icon: MessagesSquare, shortcut: "G I" },
  { href: "/knowledge", key: "knowledge", icon: Library, shortcut: "G K" },
  { href: "/companies", key: "companies", icon: Building2, shortcut: "G C" },
  { href: "/analytics", key: "analytics", icon: BarChart3, shortcut: "G A" },
  { href: "/settings", key: "settings", icon: Settings, shortcut: "G S" },
];

export const PERSONAL_NAV: NavItem[] = [
  { href: "/schedule", key: "schedule", icon: CalendarDays, shortcut: "G T" },
  { href: "/experience", key: "experience", icon: Briefcase, shortcut: "G E" },
];

function matches(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** The most specific matching nav item is active (e.g. /practice/bank activates "Problem bank", not "Practice"). */
export function isActive(pathname: string, href: string) {
  if (!matches(pathname, href)) return false;
  return ![...MAIN_NAV, ...PERSONAL_NAV].some(
    (n) => n.href !== href && n.href.startsWith(`${href}/`) && matches(pathname, n.href),
  );
}

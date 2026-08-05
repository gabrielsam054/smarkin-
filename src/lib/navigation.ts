import {
  LayoutDashboard, Users, Target, FileText, Compass, Megaphone,
  Brain, ListChecks, Fingerprint, BookOpen, Share2, Plug, Settings, Archive,
  LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for the sidebar. Matches the UX Spec v1.0
 * information architecture exactly — grouping by task (Research,
 * Advertising) with one deliberate exception (Intelligence, which
 * groups by engine on purpose, per the spec's stated reasoning).
 *
 * status drives real UI behavior, not decoration:
 *  - "live"     : normal nav item, fully clickable
 *  - "phase2"   : clickable, but the page itself renders its own
 *                 honest state (Integrations is the one Phase 2 page
 *                 fully specified — see IMPLEMENTATION_LOG)
 *  - "reserved" : rendered with a lock icon, navigates to a page that
 *                 shows ONLY the EmptyCapabilityCard-pattern state
 *                 defined in the UX spec — never a fabricated preview
 */
export type NavStatus = "live" | "phase2" | "reserved";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  status: NavStatus;
}

export interface NavGroup {
  label: string | null; // null = ungrouped (Mission Control)
  items: NavItem[];
}

export const NAVIGATION: NavGroup[] = [
  {
    label: null,
    items: [
      { label: "Mission Control", href: "/dashboard", icon: LayoutDashboard, status: "live" },
    ],
  },
  {
    label: "Research",
    items: [
      { label: "Customer Research", href: "/research/new", icon: Users, status: "live" },
      { label: "Audience Research", href: "/audience/new", icon: Target, status: "live" },
      { label: "Reports", href: "/reports", icon: FileText, status: "live" },
    ],
  },
  {
    label: "Advertising",
    items: [
      { label: "Decisions", href: "/decision/new", icon: Compass, status: "live" },
      { label: "Campaigns", href: "/campaigns", icon: Megaphone, status: "live" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Marketing Brain", href: "/intelligence/brain", icon: Brain, status: "live" },
      { label: "Opportunities", href: "/intelligence/opportunities", icon: ListChecks, status: "live" },
      { label: "Patterns", href: "/intelligence/patterns", icon: Fingerprint, status: "reserved" },
      { label: "Memory", href: "/intelligence/memory", icon: BookOpen, status: "live" },
      { label: "Knowledge Graph", href: "/intelligence/graph", icon: Share2, status: "reserved" },
    ],
  },
  {
    label: "Legacy",
    items: [
      { label: "Meta Ads Interest Finder", href: "/analysis/new", icon: Archive, status: "live" },
    ],
  },
  {
    label: null,
    items: [
      { label: "Integrations", href: "/integrations", icon: Plug, status: "phase2" },
      { label: "Settings", href: "/settings", icon: Settings, status: "live" },
    ],
  },
];

import {
  LayoutDashboard, FileText, Megaphone, Plug, Settings, Archive,
  LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for the sidebar. Collapsed per the explicit
 * architectural decision: Smarkin is one AI Marketing Consultant, not
 * a collection of tools — internal intelligence engines (Marketing
 * Brain, Opportunities, Patterns, Memory, Knowledge Graph, Decisions,
 * Customer/Audience Research) remain fully real, working pages in the
 * codebase, independently testable, just no longer primary navigation
 * items. The AI Consultant (the right-side panel on Mission Control)
 * now orchestrates them via /api/v1/consultant.
 *
 * This collapse only happened once a real blocking reason was
 * resolved: the consultant's old hard decline used to point users
 * by name to these exact pages ("check Marketing Brain, Opportunities,
 * or Decisions directly") — hiding them while that message still
 * existed would have been a real, immediate contradiction. Option C
 * removed that hard decline entirely, so the contradiction no longer
 * applies.
 *
 * Meta Ads Interest Finder is deliberately NOT grouped as an internal
 * engine — per the Constitution, it remains a first-class, visible
 * product in its own right.
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
    label: null,
    items: [
      { label: "Campaigns", href: "/campaigns", icon: Megaphone, status: "live" },
      { label: "Reports", href: "/reports", icon: FileText, status: "live" },
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

// Every internal-engine page still exists and is still fully real and
// reachable directly by URL - only removed from primary navigation.
// Kept here as a real reference, not a dead list, so a future
// developer (or future Claude) can find them without guessing:
//   /research/new           - Customer Research
//   /audience/new           - Audience Research
//   /decision/new           - Decisions
//   /intelligence/brain     - Marketing Brain
//   /intelligence/opportunities - Opportunities
//   /intelligence/patterns  - Patterns
//   /intelligence/memory    - Memory
//   /intelligence/graph     - Knowledge Graph

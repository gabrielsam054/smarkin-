"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { NAVIGATION, NavItem } from "@/lib/navigation";

/**
 * Responsive per UX Spec Phase 8:
 *  - >=lg (1024px):  full sidebar, icon + label
 *  - md..lg:         icon-only, label on hover/focus via title + a
 *                     visually-hidden span for screen readers
 *  - <md:            not rendered here — AppShell swaps this for an
 *                     overlay drawer using the same NAVIGATION data
 *                     (mobileOpen prop), so there is exactly one
 *                     source of truth for nav content at every size.
 */
export function Sidebar({ activeLabel, mobileOpen, onMobileClose }: {
  activeLabel: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  return (
    <>
      {/* Desktop / tablet rail */}
      <nav
        aria-label="Primary"
        className="hidden md:flex md:flex-col w-16 lg:w-60 shrink-0 border-r border-border bg-surface h-screen sticky top-0 py-4 overflow-y-auto"
      >
        <SidebarContent activeLabel={activeLabel} />
      </nav>

      {/* Mobile overlay drawer — <768px, per Phase 8 */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30" role="dialog" aria-modal="true" aria-label="Navigation">
          <div
            className="absolute inset-0 bg-text-primary/20"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <nav
            aria-label="Primary"
            className="absolute left-0 top-0 h-full w-72 bg-surface border-r border-border py-4 overflow-y-auto"
          >
            <SidebarContent activeLabel={activeLabel} onNavigate={onMobileClose} />
          </nav>
        </div>
      )}
    </>
  );
}

function SidebarContent({ activeLabel, onNavigate }: { activeLabel: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-5 px-2 lg:px-3">
      {NAVIGATION.map((group, gi) => (
        <div key={gi} className="flex flex-col gap-1">
          {group.label && (
            <p className="hidden lg:block px-2.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
              {group.label}
            </p>
          )}
          {group.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={activeLabel === item.label || pathname === item.href}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  const reserved = item.status === "reserved";

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={`nav-item justify-center lg:justify-start relative ${active ? "nav-item-active" : ""}`}
    >
      <Icon size={17} className="shrink-0" aria-hidden="true" />
      <span className="hidden lg:inline truncate">{item.label}</span>
      {reserved && (
        <Lock
          size={11}
          className="hidden lg:inline text-text-muted ml-auto shrink-0"
          aria-label="Coming soon"
        />
      )}
      {/* Screen-reader label for icon-only tablet state */}
      <span className="sr-only lg:hidden">
        {item.label}{reserved ? " (coming soon)" : ""}
      </span>
    </Link>
  );
}

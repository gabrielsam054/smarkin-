"use client";

import { useState, ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./Sidebar";

/**
 * Reconstructed against the prop contract this project's real pages have
 * called consistently (research/[id], reports, dashboard, audience/[id]):
 * firstName / initials / isAdmin / activeLabel / headerLeft / headerRight
 * / userSubtitle / children. If your actual AppShell differs, diff this
 * before merging — see IMPLEMENTATION_LOG for why this reconstruction
 * approach was necessary this turn.
 *
 * NOTE on scope: the header bar here covers what Phase 1 of the
 * implementation order actually lists (Header, Navigation). Command
 * Palette and Notification Center appear in the UX Spec's "Global
 * elements" but not in any numbered phase of this build order — they
 * are NOT stubbed here (a dead bell icon would violate "no placeholder
 * implementations"). Flagged in the log as a gap to resolve, not
 * silently decided either way.
 */
export interface AppShellProps {
  firstName: string;
  initials: string;
  isAdmin: boolean;
  activeLabel: string;
  userSubtitle?: string;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function AppShell({
  firstName, initials, isAdmin, activeLabel, userSubtitle, headerLeft, headerRight, children,
}: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        activeLabel={activeLabel}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 h-14 px-4 sm:px-6 border-b border-border bg-surface/90 backdrop-blur">
          <button
            type="button"
            className="md:hidden text-text-secondary hover:text-text-primary"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          {mobileNavOpen && (
            <button
              type="button"
              className="md:hidden fixed top-4 right-4 z-40 text-text-secondary hover:text-text-primary"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          )}

          <div className="flex items-center gap-3 min-w-0">{headerLeft}</div>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            {headerRight}
            <UserMenu firstName={firstName} initials={initials} isAdmin={isAdmin} subtitle={userSubtitle} />
          </div>
        </header>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

function UserMenu({ firstName, initials, isAdmin, subtitle }: {
  firstName: string; initials: string; isAdmin: boolean; subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 pl-3 border-l border-border">
      <div
        className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-none"
        aria-hidden="true"
      >
        {initials}
      </div>
      <div className="hidden sm:block leading-tight">
        <p className="text-xs font-semibold text-text-primary">{firstName}{isAdmin ? " · Admin" : ""}</p>
        {subtitle && <p className="text-[11px] text-text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

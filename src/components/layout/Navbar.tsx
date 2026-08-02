"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { Menu, X, LayoutDashboard, User, CreditCard, Settings, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing",  label: "Pricing"  },
  { href: "/about",    label: "About"    },
  { href: "/contact",  label: "Contact"  },
];

// ── Avatar dropdown ───────────────────────────────────────────
function AvatarMenu({ user, signOut }: { user: { email?: string | null; user_metadata?: Record<string, unknown> }; signOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const name = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? user.email?.split("@")[0] ?? "Account";
  const initials = name.charAt(0).toUpperCase();

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-border hover:border-border-strong bg-surface-2 hover:bg-surface-3 transition-all duration-150"
      >
        {/* Avatar */}
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-dim flex items-center justify-center text-primary-foreground text-[11px] font-bold flex-none">
          {initials}
        </div>
        <span className="text-sm font-medium text-text-primary hidden sm:block max-w-[100px] truncate">{name}</span>
        <ChevronDown size={13} className={`text-text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-surface border border-border rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden z-50 animate-fade-in">
          {/* User info */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-text-primary truncate">{name}</p>
            <p className="text-[11px] text-text-muted truncate mt-0.5">{user.email}</p>
          </div>

          {/* Menu items */}
          <div className="p-1.5">
            {[
              { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard"   },
              { href: "/profile",   icon: User,            label: "My Profile"  },
              { href: "/billing",   icon: CreditCard,      label: "Billing"     },
              { href: "/settings",  icon: Settings,        label: "Settings"    },
            ].map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
              >
                <Icon size={14} className="flex-none" />
                {label}
              </Link>
            ))}
          </div>

          <div className="p-1.5 border-t border-border">
            <button
              onClick={() => { setOpen(false); signOut(); }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/8 transition-colors w-full"
            >
              <LogOut size={14} className="flex-none" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Loading skeleton for nav CTAs ─────────────────────────────
function NavSkeleton() {
  return (
    <div className="hidden md:flex items-center gap-3">
      <div className="h-8 w-16 rounded-lg bg-surface-2 animate-pulse" />
      <div className="h-8 w-28 rounded-full bg-surface-2 animate-pulse" />
    </div>
  );
}

// ── Main Navbar ───────────────────────────────────────────────
export function Navbar() {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const isLoggedIn = !!user;

  return (
    <header className="fixed top-0 inset-x-0 z-50 glass border-b border-border">
      <div className="container-app h-16 flex items-center justify-between gap-6">

        {/* Logo — goes to /dashboard if logged in, / if not */}
        <Link
          href={isLoggedIn ? "/dashboard" : "/"}
          className="flex items-center gap-2.5 flex-none group"
        >
          <Image src="/logo.png" alt="Smarkin" width={36} height={36} className="object-contain" priority />
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-bold text-text-primary tracking-tight group-hover:text-primary transition-colors">
              Smarkin
            </span>
            <span className="text-[8px] font-mono uppercase tracking-[2px] text-text-muted">
              Growth by Success
            </span>
          </div>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {/* Dashboard link replaces Home when logged in */}
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary hover:bg-surface-2 rounded-lg transition-colors"
            >
              <LayoutDashboard size={14} />
              Dashboard
            </Link>
          ) : null}
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-surface-2"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-3 flex-none">
          {loading ? (
            <NavSkeleton />
          ) : isLoggedIn ? (
            /* Logged in: show avatar dropdown */
            <AvatarMenu user={user!} signOut={signOut} />
          ) : (
            /* Logged out: show Sign In + CTA */
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors px-3"
              >
                Sign in
              </Link>
              <Button size="sm" asChild>
                <Link href="/signup">Get Started Free →</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors text-text-secondary"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-surface px-4 pb-5">
          <nav className="flex flex-col gap-1 pt-3">
            {isLoggedIn && (
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-primary bg-primary/8 rounded-lg"
              >
                <LayoutDashboard size={14} />
                Dashboard
              </Link>
            )}
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg transition-colors"
              >
                {label}
              </Link>
            ))}

            <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border">
              {loading ? (
                <div className="h-9 rounded-lg bg-surface-2 animate-pulse" />
              ) : isLoggedIn ? (
                <>
                  <div className="px-3 py-2 text-xs text-text-muted">{user.email}</div>
                  {[
                    { href: "/profile",  label: "My Profile" },
                    { href: "/billing",  label: "Billing"    },
                    { href: "/settings", label: "Settings"   },
                  ].map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className="px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg transition-colors"
                    >
                      {label}
                    </Link>
                  ))}
                  <button
                    onClick={() => { setOpen(false); signOut(); }}
                    className="px-3 py-2.5 text-sm font-medium text-destructive text-left hover:bg-destructive/8 rounded-lg transition-colors"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="px-3 py-2.5 text-sm font-medium text-text-secondary text-center hover:bg-surface-2 rounded-lg"
                  >
                    Sign in
                  </Link>
                  <Button size="sm" asChild>
                    <Link href="/signup" onClick={() => setOpen(false)}>Get Started Free</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

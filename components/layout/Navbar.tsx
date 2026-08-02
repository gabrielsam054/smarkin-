"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/Button";
import { LogoutButton } from "@/components/shared/LogoutButton";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useScrolled } from "@/hooks/useScrolled";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const scrolled = useScrolled(20);
  const { user, loading } = useAuth();

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-[#0B1120]/90 backdrop-blur-md border-b border-border shadow-card"
          : "bg-transparent"
      )}
    >
      <div className="container-app">
        <nav className="flex items-center justify-between h-16">
          <Logo />

          {/* Desktop nav */}
          <ul className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "px-4 py-2 rounded-sm text-sm font-body font-medium transition-colors duration-150",
                    pathname === item.href
                      ? "text-text-primary bg-surface-2"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-2/60"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop CTA — auth-aware */}
          <div className="hidden md:flex items-center gap-3">
            {!loading && (
              user ? (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard" className="gap-2">
                      <LayoutDashboard size={14} />
                      Dashboard
                    </Link>
                  </Button>
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/login">Login</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/signup">Get Started</Link>
                  </Button>
                </>
              )
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-sm border border-border text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </nav>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-[#0B1120]/95 backdrop-blur-md border-b border-border overflow-hidden"
          >
            <div className="container-app py-4 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-sm text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "text-text-primary bg-surface-2"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex gap-3 pt-4 border-t border-border mt-2">
                {user ? (
                  <>
                    <Button variant="ghost" size="sm" className="flex-1" asChild>
                      <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                        Dashboard
                      </Link>
                    </Button>
                    <LogoutButton />
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" className="flex-1" asChild>
                      <Link href="/login" onClick={() => setMobileOpen(false)}>Login</Link>
                    </Button>
                    <Button size="sm" className="flex-1" asChild>
                      <Link href="/signup" onClick={() => setMobileOpen(false)}>Get Started</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

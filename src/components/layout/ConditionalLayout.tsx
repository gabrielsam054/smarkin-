"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import type { ReactNode } from "react";

const APP_PREFIXES = [
  "/dashboard", "/analysis", "/admin", "/billing",
  "/profile", "/settings", "/auth", "/login", "/signup",
];

export function ConditionalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isApp = APP_PREFIXES.some((p) => pathname.startsWith(p));

  if (isApp) return <>{children}</>;

  return (
    <>
      <Navbar />
      <main className="pt-16">{children}</main>
      <Footer />
    </>
  );
}

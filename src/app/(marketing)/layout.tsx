import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="pt-16">{children}</main>
      <Footer />
    </>
  );
}

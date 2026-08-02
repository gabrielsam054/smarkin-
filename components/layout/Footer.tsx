import Link from "next/link";
import { Logo } from "./Logo";
import { FOOTER_LINKS, SITE } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container-app py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand col */}
          <div className="md:col-span-2">
            <Logo size="sm" />
            <p className="mt-4 text-sm text-text-secondary leading-relaxed max-w-xs">
              AI Audience Intelligence for Meta Advertisers. Generate high-quality
              audience recommendations powered by your proprietary knowledge engine.
            </p>
            <p className="mt-6 text-xs text-text-muted font-mono">
              © {new Date().getFullYear()} {SITE.name}. All rights reserved.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-mono font-semibold uppercase tracking-widest text-text-muted mb-4">
              Product
            </h4>
            <ul className="flex flex-col gap-3">
              {FOOTER_LINKS.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-mono font-semibold uppercase tracking-widest text-text-muted mb-4">
              Company
            </h4>
            <ul className="flex flex-col gap-3">
              {FOOTER_LINKS.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-mono font-semibold uppercase tracking-widest text-text-muted mb-4">
              Legal
            </h4>
            <ul className="flex flex-col gap-3">
              {FOOTER_LINKS.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

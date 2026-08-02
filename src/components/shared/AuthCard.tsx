import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AuthCard({ title, subtitle, children, footer, className }: AuthCardProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#F8FAFC]">
      {/* Background glow */}
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />

      <div className={cn("relative z-10 w-full max-w-md", className)}>
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl p-8 shadow-card-lg">
          <div className="mb-8">
            <h1 className="text-2xl font-heading font-bold text-text-primary mb-1.5">
              {title}
            </h1>
            {subtitle && (
              <div className="text-sm text-text-secondary">{subtitle}</div>
            )}
          </div>

          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="mt-6 text-center text-sm text-text-secondary">
            {footer}
          </div>
        )}

        {/* Back to home */}
        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-xs text-text-muted hover:text-text-secondary transition-colors font-mono"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

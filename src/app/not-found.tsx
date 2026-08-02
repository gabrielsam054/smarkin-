import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 text-center max-w-lg">
        {/* 404 visual */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="text-[120px] font-heading font-bold text-text-primary/5 leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-surface border border-primary/30 flex items-center justify-center shadow-green">
              <Search size={28} className="text-primary" />
            </div>
          </div>
        </div>

        <p className="font-mono text-xs tracking-[3px] uppercase text-primary mb-4">
          404 — Page Not Found
        </p>
        <h1 className="text-4xl font-heading font-bold text-text-primary mb-4">
          This audience doesn&apos;t exist
        </h1>
        <p className="text-text-secondary text-lg mb-10">
          The page you&apos;re looking for has moved, been deleted, or never existed.
          Let&apos;s get you back to finding real audiences.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild>
            <Link href="/">
              <ArrowLeft size={16} />
              Back to Home
            </Link>
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <Link href="/features">Explore Features</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

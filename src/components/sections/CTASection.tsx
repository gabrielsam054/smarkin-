import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="section-padding border-t border-border">
      <div className="container-app">
        <div className="relative overflow-hidden rounded-2xl bg-surface border border-primary/25 shadow-green px-8 py-14 text-center">
          <div className="absolute inset-0 bg-hero-gradient pointer-events-none opacity-60" />
          <div className="relative z-10">
            <p className="text-xs font-semibold text-primary uppercase tracking-[3px] mb-4">Get Started Today</p>
            <h2 className="text-4xl font-black text-text-primary mb-4 text-balance">
              Ready to find your perfect audience?
            </h2>
            <p className="text-text-secondary max-w-lg mx-auto mb-8">
              Join thousands of marketers using Smarkin AI to launch winning Meta ad campaigns.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/signup"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-8 py-3.5 rounded-full shadow-green-btn hover:bg-primary-dim hover:-translate-y-px transition-all text-[15px]">
                Start Free Trial <ArrowRight size={16} />
              </Link>
              <Link href="/pricing"
                className="inline-flex items-center gap-2 border border-border-strong text-text-primary font-semibold px-8 py-3.5 rounded-full hover:bg-surface-2 transition-all text-[15px]">
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

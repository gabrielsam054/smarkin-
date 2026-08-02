"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CTASection() {
  return (
    <section className="section-padding">
      <div className="container-app">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative rounded-2xl bg-surface border border-primary/20 p-12 lg:p-20 text-center overflow-hidden"
        >
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-radial from-primary/8 via-transparent to-transparent pointer-events-none" />

          <p className="font-mono text-xs tracking-[3px] uppercase text-primary mb-4">
            Get Started Today
          </p>
          <h2 className="text-4xl lg:text-5xl font-heading font-bold text-text-primary max-w-2xl mx-auto text-balance">
            Ready to build smarter Meta audiences?
          </h2>
          <p className="mt-4 text-text-secondary text-lg max-w-lg mx-auto">
            Join hundreds of Meta advertisers using AI audience intelligence to
            launch better campaigns.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="xl" asChild className="group w-full sm:w-auto">
              <Link href="/signup">
                Start Free Trial
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
            </Button>
            <Button variant="secondary" size="xl" className="w-full sm:w-auto" asChild>
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-text-muted font-mono">
            3 free reports · No credit card required
          </p>
        </motion.div>
      </div>
    </section>
  );
}

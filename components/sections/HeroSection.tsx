"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="container-app relative z-10 py-24">
        <div className="max-w-4xl mx-auto text-center">

          {/* Announcement badge */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-8"
          >
            <Badge variant="green" className="gap-1.5 py-1.5 px-4">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Now in Beta — Free to Start
            </Badge>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-heading font-bold leading-[1.1] tracking-tight text-balance"
          >
            AI Audience Intelligence{" "}
            <span className="gradient-text">For Meta Advertisers</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed"
          >
            Generate audience intelligence reports powered by AI and your
            proprietary marketing knowledge engine. Not an interest finder —
            an intelligence system.
          </motion.p>

          {/* CTA row */}
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button size="xl" asChild className="group w-full sm:w-auto">
              <Link href="/signup">
                Start Free
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
            </Button>
            <Button
              variant="secondary"
              size="xl"
              className="w-full sm:w-auto gap-2"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-full border border-border-strong">
                <Play size={12} fill="currentColor" />
              </span>
              Watch Demo
            </Button>
          </motion.div>

          {/* Social proof */}
          <motion.p
            variants={fadeUp}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 text-xs text-text-muted font-mono tracking-wide"
          >
            Free trial · No credit card required · Cancel anytime
          </motion.p>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-20 relative"
          >
            {/* Glow behind card */}
            <div className="absolute inset-x-0 -top-8 h-1/2 bg-gradient-to-b from-primary/8 to-transparent blur-2xl" />

            {/* Mock dashboard card */}
            <div className="relative bg-surface border border-border rounded-2xl p-6 shadow-card-lg text-left overflow-hidden">
              {/* Top bar */}
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-amber/60" />
                <div className="w-3 h-3 rounded-full bg-primary/60" />
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs font-mono text-text-muted">Audience Intelligence Report</span>
                  <Badge variant="green">Live</Badge>
                </div>
              </div>

              {/* Mock report preview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Industry", value: "Health & Fitness" },
                  { label: "Product Type", value: "Physical Product" },
                  { label: "Customer Intent", value: "Buy" },
                ].map((item) => (
                  <div key={item.label} className="bg-[#0B1120] border border-border rounded-sm p-4">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-1.5">
                      {item.label}
                    </p>
                    <p className="text-sm font-heading font-semibold text-text-primary">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Interests preview */}
              <div className="mt-4 bg-[#0B1120] border border-border rounded-sm p-4">
                <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-3">
                  Primary Interests
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Bodybuilding", "Fitness", "Whey Protein", "Gym", "Sports Nutrition", "Muscle Building"].map((i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full text-xs font-mono bg-primary/10 text-primary border border-primary/30"
                    >
                      {i}
                    </span>
                  ))}
                </div>
              </div>

              {/* Confidence score */}
              <div className="mt-4 flex items-center justify-between bg-[#0B1120] border border-border rounded-sm p-4">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-1">
                    Overall Confidence
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-40 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary-dim to-primary rounded-full" style={{ width: "87%" }} />
                    </div>
                    <span className="text-sm font-heading font-bold text-primary">87%</span>
                  </div>
                </div>
                <Badge variant="green">Report Ready</Badge>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

// Mini dashboard preview SVG
function DashboardPreview() {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-border shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
      style={{ background: "#FFFFFF" }}>
      {/* Titlebar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border" style={{ background: "#111827" }}>
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <span className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 mx-4">
          <div className="h-5 rounded-md bg-surface-2 flex items-center px-3 gap-2 max-w-[200px] mx-auto">
            <span className="text-[9px] text-text-muted">smarkin.ai/dashboard</span>
          </div>
        </div>
      </div>

      {/* Dashboard layout */}
      <div className="flex" style={{ minHeight: 340 }}>
        {/* Sidebar */}
        <div className="w-[140px] border-r border-border p-3 flex-none" style={{ background: "#111827" }}>
          <div className="flex items-center gap-2 mb-4 px-1">
            <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
              <span className="text-primary text-[8px] font-bold">S</span>
            </div>
            <span className="text-[9px] font-bold text-text-primary">Smarkin</span>
          </div>
          {["Dashboard","Audience Intelligence","Campaign Strategy","AI Creative Studio","Reports","Ads Accounts","Billing & Plans","Settings"].map((item, i) => (
            <div key={item} className={`text-[8px] px-2 py-1.5 rounded mb-0.5 truncate ${i === 0 ? "bg-primary/10 text-primary font-semibold" : "text-text-muted hover:text-text-secondary"}`}>
              {item}
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-bold text-text-primary">Good morning, Gabriel! 👋</p>
              <p className="text-[8px] text-text-muted">Here&apos;s what&apos;s happening with your ad intelligence today.</p>
            </div>
            <div className="text-[7px] text-text-muted border border-border rounded px-1.5 py-0.5">May 20 – 26, 2025</div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label:"Analyses Used", value:"12 / 50", color:"#7C3AED" },
              { label:"Campaigns Analyzed", value:"37", color:"#D97706" },
              { label:"Ad Accounts", value:"5", color:"#D97706" },
              { label:"Reports Generated", value:"23", color:"#3B82F6" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg p-2.5 border border-border" style={{ background: "#111827" }}>
                <p className="text-[7px] text-text-muted mb-1">{label}</p>
                <p className="text-[11px] font-bold" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Bottom grid */}
          <div className="grid grid-cols-[1fr_100px] gap-2">
            <div className="rounded-lg border border-border p-3" style={{ background: "#111827" }}>
              <p className="text-[8px] font-semibold text-text-primary mb-2">Recent Activity</p>
              {["Campaign Strategy — Analyzed for: Fitness Coach",
                "Audience Intelligence — Completed analysis",
                "Campaign Strategy — Analyzed for: Skincare Brand"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                  <div className="w-4 h-4 rounded-md bg-surface-2 flex-none" />
                  <p className="text-[7px] text-text-muted truncate flex-1">{item}</p>
                  <p className="text-[6px] text-text-muted flex-none">{["Today","Today","Yesterday"][i]}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-border p-3 flex flex-col items-center justify-center" style={{ background: "#111827" }}>
              <p className="text-[8px] font-semibold text-text-primary mb-2 text-center">Match Score</p>
              <svg width="70" height="50" viewBox="0 0 70 50">
                <path d="M 8 44 A 30 30 0 0 1 62 44" fill="none" stroke="#E2E8F0" strokeWidth="7" strokeLinecap="round"/>
                <path d="M 8 44 A 30 30 0 0 1 62 44" fill="none" stroke="#7C3AED" strokeWidth="7" strokeLinecap="round"
                  strokeDasharray="100 94" style={{ filter: "drop-shadow(0 0 4px rgba(124,58,237,0.6))" }}/>
                <text x="35" y="38" textAnchor="middle" fontSize="12" fontWeight="700" fill="#7C3AED" fontFamily="Inter">87%</text>
              </svg>
              <p className="text-[7px] text-primary mt-1">High Match</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
      <div className="absolute inset-0 bg-dots pointer-events-none opacity-40" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/6 blur-[120px] rounded-full pointer-events-none" />

      <div className="container-app relative z-10 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: copy */}
          <div>
            {/* Badge */}
            <motion.div variants={fadeUp} initial="initial" animate="animate" transition={{ duration: 0.4 }}>
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 border border-primary/25 rounded-full px-4 py-2 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                AI-Powered Audience Intelligence
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={fadeUp} initial="initial" animate="animate"
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-5xl lg:text-6xl font-black text-text-primary leading-[1.05] tracking-tight mb-6 text-balance"
            >
              Find the right audience.{" "}
              <span className="gradient-text">Launch winning ads.</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={fadeUp} initial="initial" animate="animate"
              transition={{ duration: 0.4, delay: 0.15 }}
              className="text-lg text-text-secondary leading-relaxed mb-8 max-w-xl text-balance"
            >
              Smarkin AI analyzes any product or service and shows you the best audiences, interests, and ad strategies that convert.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeUp} initial="initial" animate="animate"
              transition={{ duration: 0.4, delay: 0.2 }}
              className="flex flex-wrap gap-3 mb-8"
            >
              <Button size="xl" asChild className="gap-2">
                <Link href="/signup">
                  Start Free Trial
                  <ArrowRight size={16} />
                </Link>
              </Button>
              <Button size="xl" variant="secondary" asChild className="gap-2">
                <Link href="#how-it-works">
                  <Play size={15} className="fill-current" />
                  See How It Works
                </Link>
              </Button>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              variants={fadeUp} initial="initial" animate="animate"
              transition={{ duration: 0.4, delay: 0.25 }}
              className="flex flex-wrap gap-4"
            >
              {["No credit card required", "Cancel anytime", "7-day free trial"].map((t) => (
                <div key={t} className="flex items-center gap-1.5 text-sm text-text-secondary">
                  <CheckCircle size={14} className="text-primary flex-none" />
                  {t}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Dashboard preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <DashboardPreview />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

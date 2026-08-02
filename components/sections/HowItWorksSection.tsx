"use client";

import { motion } from "framer-motion";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { HOW_IT_WORKS } from "@/lib/constants";

export function HowItWorksSection() {
  return (
    <section className="section-padding bg-surface/30">
      <div className="container-app">
        <div className="text-center mb-16">
          <SectionLabel>How It Works</SectionLabel>
          <h2 className="text-4xl lg:text-5xl font-heading font-bold text-text-primary">
            From product to audience in minutes
          </h2>
          <p className="mt-4 text-text-secondary text-lg max-w-xl mx-auto">
            A 23-step AI reasoning process that analyzes your business before recommending a single interest.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-10 left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-px bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

          {HOW_IT_WORKS.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              className="relative"
            >
              {/* Step number */}
              <div className="relative z-10 w-12 h-12 rounded-full bg-surface border-2 border-primary/40 flex items-center justify-center mb-6 mx-auto lg:mx-0">
                <span className="font-mono font-bold text-sm text-primary">
                  {String(step.step).padStart(2, "0")}
                </span>
              </div>

              <div className="text-2xl mb-3 text-center lg:text-left">{step.icon}</div>
              <h3 className="font-heading font-semibold text-base text-text-primary mb-2 text-center lg:text-left">
                {step.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed text-center lg:text-left">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

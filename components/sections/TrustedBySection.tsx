"use client";

import { motion } from "framer-motion";
import { TRUSTED_COMPANIES } from "@/lib/constants";

export function TrustedBySection() {
  return (
    <section className="py-16 border-y border-border bg-surface/50">
      <div className="container-app">
        <p className="text-center text-xs font-mono uppercase tracking-[3px] text-text-muted mb-10">
          Trusted by marketing teams at
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {TRUSTED_COMPANIES.map((company, i) => (
            <motion.div
              key={company}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              className="text-text-muted/60 font-heading font-semibold text-lg tracking-tight hover:text-text-secondary transition-colors duration-200"
            >
              {company}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

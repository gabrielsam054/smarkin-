"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ReportSectionProps {
  label: string;
  icon: string;
  badge?: string | number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  accent?: "green" | "blue" | "amber";
}

export function ReportSection({
  label,
  icon,
  badge,
  defaultOpen = false,
  children,
  accent = "green",
}: ReportSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  const accentMap = {
    green: "text-primary border-primary/30 bg-primary/5",
    blue: "text-secondary border-secondary/30 bg-secondary/5",
    amber: "text-amber border-amber/30 bg-amber/10",
  };

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden transition-colors hover:border-border-strong">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="font-heading font-semibold text-text-primary text-base">
            {label}
          </span>
          {badge !== undefined && (
            <span
              className={cn(
                "font-mono text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border",
                accentMap[accent]
              )}
            >
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          size={18}
          className={cn(
            "text-text-muted flex-none transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-0 border-t border-border">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

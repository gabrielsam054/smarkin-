"use client";

import { Target, Zap, Users, MapPin, BarChart2, GitBranch, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TargetingStack } from "@/lib/intelligence";

interface TargetingStackDisplayProps {
  stack: TargetingStack;
}

const ITEMS = [
  { key: "primaryInterest",    label: "Primary Interest",    Icon: Target,    color: "text-primary",   bg: "bg-primary/10",   border: "border-primary/30" },
  { key: "primaryBehavior",    label: "Behavior",            Icon: Zap,       color: "text-amber",     bg: "bg-amber/10",     border: "border-amber/30" },
  { key: "primaryPersona",     label: "Persona",             Icon: Users,     color: "text-secondary", bg: "bg-secondary/10", border: "border-secondary/30" },
  { key: "primaryDemographic", label: "Demographic",         Icon: MapPin,    color: "text-violet-400",bg: "bg-violet-400/10",border: "border-violet-400/30" },
  { key: "campaignObjective",  label: "Campaign Objective",  Icon: BarChart2, color: "text-teal-400",  bg: "bg-teal-400/10",  border: "border-teal-400/25" },
  { key: "funnelStage",        label: "Funnel Stage",        Icon: GitBranch, color: "text-rose-400",  bg: "bg-rose-400/10",  border: "border-rose-400/25" },
] as const;

const REASON_KEYS: Record<string, keyof TargetingStack> = {
  primaryInterest:    "primaryInterestReason",
  primaryBehavior:    "primaryBehaviorReason",
  primaryPersona:     "primaryPersonaReason",
  primaryDemographic: "primaryDemographicReason",
};

export function TargetingStackDisplay({ stack }: TargetingStackDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Ad Set Name */}
      <div className="bg-[#F8FAFC] border border-primary/20 rounded-sm p-4">
        <p className="font-mono text-[9px] uppercase tracking-[2px] text-primary mb-1">
          Suggested Meta Ad Set Name
        </p>
        <p className="font-heading font-semibold text-text-primary text-sm flex items-center gap-2">
          {stack.adSetName}
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(stack.adSetName)}
            className="text-text-muted hover:text-primary transition-colors"
            title="Copy to clipboard"
          >
            <Copy size={12} />
          </button>
        </p>
      </div>

      {/* Stack items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ITEMS.map(({ key, label, Icon, color, bg, border }) => {
          const value = stack[key as keyof TargetingStack] as string;
          const reasonKey = REASON_KEYS[key];
          const reason = reasonKey ? stack[reasonKey] as string : undefined;

          return (
            <div key={key} className={cn("rounded-sm border p-4", bg, border)}>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-6 h-6 rounded flex items-center justify-center", bg)}>
                  <Icon size={12} className={cn(color, "flex-none")} />
                </div>
                <p className={cn("font-mono text-[9px] uppercase tracking-[1.5px] font-bold", color)}>
                  {label}
                </p>
              </div>
              <p className="font-heading font-semibold text-text-primary text-sm mb-1">{value}</p>
              {reason && <p className="text-[10px] text-text-muted leading-relaxed">{reason}</p>}
            </div>
          );
        })}
      </div>

      {/* Reach estimate */}
      <div className="flex items-center justify-between bg-[#F8FAFC] border border-border rounded-sm px-4 py-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted mb-0.5">
            Estimated Reach
          </p>
          <p className="text-sm font-heading font-semibold text-text-primary">{stack.estimatedReach}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted mb-0.5">
            Funnel Stage
          </p>
          <p className="text-sm font-heading font-semibold text-primary">{stack.funnelStage}</p>
        </div>
      </div>

      {/* Stack explanation */}
      <div className="bg-[#F8FAFC] border border-border rounded-sm px-4 py-3">
        <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted mb-2">Stack Logic</p>
        <p className="text-xs text-text-secondary leading-relaxed">{stack.stackExplanation}</p>
      </div>
    </div>
  );
}

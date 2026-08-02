"use client";

import { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeightedConfidence } from "@/lib/intelligence";

interface WeightedConfidenceDisplayProps {
  confidence: WeightedConfidence;
}

export function WeightedConfidenceDisplay({ confidence }: WeightedConfidenceDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  const colorMap = {
    green: { bar: "bg-primary", text: "text-primary", glow: "shadow-[0_0_12px_rgba(34,197,94,0.3)]" },
    amber: { bar: "bg-amber",   text: "text-amber",   glow: "shadow-[0_0_12px_rgba(245,158,11,0.3)]" },
    red:   { bar: "bg-destructive", text: "text-destructive", glow: "shadow-[0_0_12px_rgba(239,68,68,0.3)]" },
  };
  const cols = colorMap[confidence.color];

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-surface-2/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Score circle */}
          <div className={cn(
            "w-14 h-14 rounded-full border-2 flex items-center justify-center flex-none",
            confidence.color === "green" ? "border-primary" :
            confidence.color === "amber" ? "border-amber" : "border-destructive",
            cols.glow
          )}>
            <span className={cn("font-heading font-bold text-lg", cols.text)}>
              {confidence.overall}%
            </span>
          </div>
          <div>
            <p className="font-heading font-bold text-text-primary">{confidence.label}</p>
            <p className="text-xs text-text-muted mt-0.5">
              Derived from 6 weighted database components
            </p>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={cn("text-text-muted flex-none transition-transform duration-200", expanded && "rotate-180")}
        />
      </button>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="border-t border-border px-6 py-5 space-y-4">
          {/* Derivation */}
          <div className="flex items-start gap-2 bg-[#0B1120] border border-border rounded-sm p-4">
            <Info size={14} className="text-text-muted flex-none mt-0.5" />
            <p className="text-xs text-text-secondary leading-relaxed">{confidence.derivation}</p>
          </div>

          {/* Component bars */}
          <div className="space-y-3">
            {confidence.components.map((comp) => (
              <div key={comp.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <span className="text-xs font-medium text-text-primary">{comp.name}</span>
                    <span className="text-[10px] text-text-muted font-mono ml-2">
                      {comp.earned}/{comp.weight} pts
                    </span>
                  </div>
                  <span className={cn("font-mono text-xs font-bold", cols.text)}>
                    {comp.percentage}%
                  </span>
                </div>
                <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", cols.bar)}
                    style={{ width: `${comp.percentage}%` }}
                  />
                </div>
                <p className="text-[10px] text-text-muted mt-1 leading-relaxed">{comp.reason}</p>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-heading font-bold text-text-primary">Overall Confidence</span>
              <span className={cn("font-mono text-sm font-bold", cols.text)}>{confidence.overall}%</span>
            </div>
            <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700", cols.bar)}
                style={{ width: `${confidence.overall}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

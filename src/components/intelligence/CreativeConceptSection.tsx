"use client";

import { useState } from "react";
import { ChevronDown, Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types — mirrors the ai_enrichment.creativeConceptLibrary shape saved by
// src/app/analysis/new/actions.ts ──────────────────────────────────────────────
export interface CreativeConcept {
  concept: string;
  targetPersona: string;
  psychologyPrinciple: string;
  headline: string;
  recommendedFormat: string;
  cta: string;
}

interface CreativeConceptSectionProps {
  concepts: CreativeConcept[] | undefined | null;
  testingStructure?: string | null;
  /** true while Claude's background enrichment is still running — see AIEnrichmentPoller */
  pending?: boolean;
}

// ── One concept card, collapsed by default — same interaction pattern as
// EnhancedInterestCard in EnhancedCards.tsx ────────────────────────────────────
function ConceptCard({ concept, index }: { concept: CreativeConcept; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "border border-border rounded-sm overflow-hidden transition-colors",
        open && "shadow-card border-border-strong"
      )}
    >
      <button type="button" onClick={() => setOpen(!open)} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] text-text-muted">{String(index + 1).padStart(2, "0")}</span>
              <p className="font-heading font-semibold text-text-primary text-sm leading-snug">
                {concept.concept}
              </p>
            </div>
            <p className="text-[10px] text-text-muted font-mono mt-0.5">
              {concept.targetPersona} · {concept.psychologyPrinciple}
            </p>
          </div>
          <ChevronDown
            size={14}
            className={cn("text-text-muted flex-none transition-transform duration-200 mt-1", open && "rotate-180")}
          />
        </div>
        <p className="text-sm text-text-primary leading-snug">&ldquo;{concept.headline}&rdquo;</p>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-border/60 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-text-muted">Format</span>
            <span className="text-text-primary font-medium text-right">{concept.recommendedFormat}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-text-muted">CTA</span>
            <span className="text-text-primary font-medium text-right">{concept.cta}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section wrapper ─────────────────────────────────────────────────────────
export function CreativeConceptSection({ concepts, testingStructure, pending }: CreativeConceptSectionProps) {
  if (pending) {
    return (
      <div className="border border-border rounded-sm p-6 flex items-center gap-3">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-none" />
        <p className="text-sm text-text-muted">Generating creative concepts...</p>
      </div>
    );
  }

  if (!concepts || concepts.length === 0) {
    return (
      <div className="border border-border rounded-sm p-6">
        <p className="text-sm text-text-muted">
          No creative concepts available — this product didn&apos;t match enough personas in the
          database to build a concept grid. Check back after the persona database is expanded for
          this category.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-primary" />
        <h3 className="font-heading font-semibold text-text-primary text-sm">
          Creative Concept Library
        </h3>
        <span className="font-mono text-[10px] text-text-muted border border-border rounded-full px-2 py-0.5">
          {concepts.length}
        </span>
      </div>

      {testingStructure && (
        <div className="flex items-start gap-2 bg-secondary/5 border border-secondary/20 rounded-sm p-3">
          <Info size={13} className="text-secondary flex-none mt-0.5" />
          <p className="text-xs text-text-muted leading-relaxed">{testingStructure}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {concepts.map((c, i) => (
          <ConceptCard key={i} concept={c} index={i} />
        ))}
      </div>
    </div>
  );
}

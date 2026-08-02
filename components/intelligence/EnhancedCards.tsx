"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { EvidenceList } from "./EvidenceBadge";
import { RelationshipPathDisplay } from "./RelationshipPath";
import type { EnhancedInterest, EnhancedBehavior, EnhancedPersona, EnhancedDemographic } from "@/lib/intelligence";

function ConfidenceBar({ score, color = "green" }: { score: number; color?: "green" | "blue" | "amber" }) {
  const bar = color === "green" ? "bg-primary" : color === "blue" ? "bg-secondary" : "bg-amber";
  return (
    <div className="h-1 w-full bg-surface-2 rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all duration-700", bar)} style={{ width: `${Math.min(100, score)}%` }} />
    </div>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n > 0 ? String(n) : "—";
}

// ── Enhanced Interest Card ────────────────────────────────────────────────────

export function EnhancedInterestCard({ interest }: { interest: EnhancedInterest }) {
  const [open, setOpen] = useState(false);
  const tierColor = interest.tier === "primary"
    ? "border-primary/30 bg-primary/5"
    : interest.tier === "secondary"
    ? "border-secondary/25 bg-secondary/5"
    : "border-amber/20 bg-amber/5";

  return (
    <div className={cn("border rounded-sm overflow-hidden transition-colors", tierColor, open && "shadow-card")}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-heading font-semibold text-text-primary text-sm leading-snug truncate">
              {interest.name}
            </p>
            <p className="text-[10px] text-text-muted font-mono mt-0.5">
              {interest.mainCategory} › {interest.subCategory}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-none">
            <span className={cn("font-mono text-[10px] font-bold",
              interest.tier === "primary" ? "text-primary" :
              interest.tier === "secondary" ? "text-secondary" : "text-amber"
            )}>
              {interest.score}%
            </span>
            <ChevronDown size={14} className={cn("text-text-muted transition-transform duration-200", open && "rotate-180")} />
          </div>
        </div>
        <ConfidenceBar score={interest.score} color={
          interest.tier === "primary" ? "green" : interest.tier === "secondary" ? "blue" : "amber"
        } />
        <div className="mt-2">
          <EvidenceList evidence={interest.evidence} max={3} />
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 space-y-4 bg-[#0B1120]/60">
          <RelationshipPathDisplay path={interest.relationshipPath} compact />
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted mb-1.5">AI Explanation</p>
            <p className="text-xs text-text-secondary leading-relaxed">{interest.explanation}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted mb-1.5">All Evidence</p>
            <EvidenceList evidence={interest.evidence} size="md" />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-text-muted">Buying Intent: <span className="text-text-secondary">{interest.buyingIntent}</span></span>
            <span className="text-text-muted">Confidence Weight: <span className="text-primary">{interest.confidenceWeight}%</span></span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Enhanced Behavior Card ────────────────────────────────────────────────────

export function EnhancedBehaviorCard({ behavior }: { behavior: EnhancedBehavior }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-sm overflow-hidden bg-[#0B1120] hover:border-border-strong transition-colors">
      <button type="button" onClick={() => setOpen(!open)} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-heading font-semibold text-text-primary text-sm leading-snug">
              {behavior.metaAudience}
            </p>
            <p className="text-[10px] text-text-muted font-mono mt-0.5">
              {behavior.parent} › {behavior.child}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-none">
            <span className="font-mono text-[10px] font-bold text-secondary">{behavior.score}%</span>
            <ChevronDown size={14} className={cn("text-text-muted transition-transform duration-200", open && "rotate-180")} />
          </div>
        </div>
        <ConfidenceBar score={behavior.score} color="blue" />
        <div className="mt-2">
          <EvidenceList evidence={behavior.evidence} max={3} />
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 space-y-4">
          <RelationshipPathDisplay path={behavior.relationshipPath} compact />
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted mb-1.5">AI Explanation</p>
            <p className="text-xs text-text-secondary leading-relaxed">{behavior.explanation}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted mb-1.5">All Evidence</p>
            <EvidenceList evidence={behavior.evidence} size="md" />
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono">
            <span className="text-text-muted">Source: <span className="text-primary">Meta Ads Manager</span></span>
            <span className="text-text-muted">Status: <span className="text-primary">{behavior.verification}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Enhanced Persona Card ─────────────────────────────────────────────────────

export function EnhancedPersonaCard({ persona, rank }: { persona: EnhancedPersona; rank: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-sm overflow-hidden bg-[#0B1120] hover:border-border-strong transition-colors">
      <button type="button" onClick={() => setOpen(!open)} className="w-full text-left p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-heading font-bold text-white text-xs flex-none">
            {persona.name?.slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading font-semibold text-text-primary text-sm">{persona.name}</p>
            <p className="text-[10px] text-text-muted font-mono">#{rank} ranked persona</p>
          </div>
          <div className="flex items-center gap-2 flex-none">
            <span className="font-mono text-[10px] font-bold text-primary">{persona.relevanceScore}%</span>
            <ChevronDown size={14} className={cn("text-text-muted transition-transform duration-200", open && "rotate-180")} />
          </div>
        </div>
        <ConfidenceBar score={persona.relevanceScore} />
        <div className="mt-2">
          <EvidenceList evidence={persona.evidence} max={3} />
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 space-y-4">
          <RelationshipPathDisplay path={persona.relationshipPath} compact />
          <div className="grid grid-cols-1 gap-2">
            {[
              { k: "Goal",      v: persona.goal },
              { k: "Pain Point",v: persona.painPoint },
              { k: "Motivation",v: persona.buyingMotivation },
            ].map(({ k, v }) => (
              <div key={k} className="flex items-start gap-2 bg-surface border border-border rounded-sm px-3 py-2">
                <span className="font-mono text-[8px] uppercase tracking-wider text-text-muted mt-0.5 w-16 flex-none">{k}</span>
                <span className="text-xs text-text-secondary leading-relaxed">{v}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted mb-1.5">AI Explanation</p>
            <p className="text-xs text-text-secondary leading-relaxed">{persona.explanation}</p>
          </div>
          <EvidenceList evidence={persona.evidence} size="md" />
        </div>
      )}
    </div>
  );
}

// ── Enhanced Demographic Card ─────────────────────────────────────────────────

export function EnhancedDemographicCard({ demographic }: { demographic: EnhancedDemographic }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-sm overflow-hidden bg-[#0B1120] hover:border-border-strong transition-colors">
      <button type="button" onClick={() => setOpen(!open)} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="font-heading font-semibold text-text-primary text-sm">{demographic.name}</p>
            <p className="text-[10px] text-text-muted font-mono mt-0.5">{demographic.category} › {demographic.subcategory}</p>
          </div>
          <ChevronDown size={14} className={cn("text-text-muted flex-none transition-transform duration-200", open && "rotate-180")} />
        </div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-mono text-text-muted">
            Reach: <span className="text-text-secondary">
              {fmt(demographic.audienceSizeMin)}–{fmt(demographic.audienceSizeMax)}
            </span>
          </p>
          <span className="text-[10px] font-mono text-text-muted">{demographic.region}</span>
        </div>
        <EvidenceList evidence={demographic.evidence} max={2} />
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 space-y-3">
          <div className="bg-surface border border-border rounded-sm px-3 py-2">
            <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted mb-0.5">Meta Path</p>
            <p className="text-xs text-text-secondary font-mono">{demographic.metaPath}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted mb-1.5">Explanation</p>
            <p className="text-xs text-text-secondary leading-relaxed">{demographic.explanation}</p>
          </div>
          <EvidenceList evidence={demographic.evidence} size="md" />
        </div>
      )}
    </div>
  );
}

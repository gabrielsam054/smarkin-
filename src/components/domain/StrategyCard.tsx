import { ConfidenceBadge } from "@/components/shared/ConfidenceBadge";

/**
 * One targeting strategy (Interest Targeting, Broad, Lookalike,
 * Retargeting, or any future platform's equivalent concept). Same honest
 * gap as AudienceCard — no real capability computes this shape yet, built
 * ready for Advertising's channel data to be reshaped into it later.
 */
export interface Strategy {
  name: string;
  bestFor: string;
  budget: string | null;
  confidence: number;
  learningSpeed: string | null;
  reasoning: string;
}

export function StrategyCard({ strategy }: { strategy: Strategy }) {
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-text-primary">{strategy.name}</h4>
        <ConfidenceBadge score={strategy.confidence} size="sm" />
      </div>
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div><p className="text-text-muted mb-0.5">Best For</p><p className="text-text-secondary">{strategy.bestFor}</p></div>
        <div><p className="text-text-muted mb-0.5">Budget</p><p className="text-text-secondary">{strategy.budget ?? "—"}</p></div>
        <div><p className="text-text-muted mb-0.5">Learning Speed</p><p className="text-text-secondary">{strategy.learningSpeed ?? "—"}</p></div>
      </div>
      <div className="border-t border-border pt-2.5">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Why Recommended</p>
        <p className="text-xs text-text-secondary">{strategy.reasoning}</p>
      </div>
    </div>
  );
}

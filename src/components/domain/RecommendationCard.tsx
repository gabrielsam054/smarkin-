import { Sparkles } from "lucide-react";
import Link from "next/link";
import { ConfidenceBadge } from "@/components/shared/ConfidenceBadge";

/**
 * Deliberately generic — title/reasoning/confidence/action, nothing
 * Advertising-specific baked in. Advertising's real DecisionResult maps in
 * naturally (title: recommendedChannel, reasoning: channelReasoning), and
 * so does Customer Research's messaging output (title: a headline or
 * offer angle, reasoning: positioning) — same component, no redesign
 * needed when a second capability adopts it.
 *
 * Single recommendation only, by construction: this component takes one
 * Recommendation, not an array. There is no "top N" prop to misuse.
 */
export interface Recommendation {
  title: string;
  confidence: number;
  reasoning: string;
  actionLabel: string;
  actionHref: string;
}

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  return (
    <div className="card p-5 flex flex-col gap-4 border-primary/20 bg-primary/[0.03]">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wide">
        <Sparkles size={13} />
        Best Next Action
      </div>

      <h3 className="text-lg font-semibold text-text-primary">{recommendation.title}</h3>

      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">Confidence</span>
        <ConfidenceBadge score={recommendation.confidence} size="sm" />
      </div>

      <div>
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Why</p>
        <p className="text-sm text-text-secondary">{recommendation.reasoning}</p>
      </div>

      <Link
        href={recommendation.actionHref}
        className="inline-flex items-center justify-center bg-primary text-primary-foreground text-sm font-semibold rounded-sm px-4 py-2.5 hover:bg-primary-dim transition-colors self-start"
      >
        {recommendation.actionLabel}
      </Link>
    </div>
  );
}

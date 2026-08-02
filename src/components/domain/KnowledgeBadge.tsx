import { confidenceTier, CONFIDENCE_COLORS } from "@/lib/confidence";

/**
 * Named explicitly in UX Spec Phase 3's component list. Visually
 * consistent with the existing ConfidenceBadge (same tier→color
 * mapping) but distinct in purpose: ConfidenceBadge shows a bare score,
 * this shows a score WITH its source attributed inline — "From the
 * Consumer Electronics Industry Pack" is meaningfully different
 * information from "82%" alone, and collapsing them into one component
 * would lose that.
 */
export function KnowledgeBadge({ source, confidence }: { source: string; confidence: number }) {
  const tier = confidenceTier(confidence);
  const { badgeClass } = CONFIDENCE_COLORS[tier];

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full border px-2.5 py-1 ${badgeClass}`}>
      <span className="font-mono">{confidence}%</span>
      <span className="opacity-60">·</span>
      <span>{source}</span>
    </span>
  );
}

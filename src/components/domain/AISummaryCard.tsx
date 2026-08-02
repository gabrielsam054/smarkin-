import { ConfidenceBadge } from "@/components/shared/ConfidenceBadge";

/**
 * Every sentence here must be traceable to a real field the caller passes
 * in — no invented claims. Deliberately does NOT say anything like "Meta
 * Ads are recommended": Customer Research doesn't decide channels, that's
 * Advertising's job. Conflating the two here would be exactly the kind of
 * fabricated-sounding-authoritative claim this whole system is built to
 * avoid — segment count and top persona are real; a channel decision from
 * a capability that doesn't make one would not be.
 */
export interface BusinessSummaryInput {
  personaCount: number;
  topPersonaName: string | null;
  topPainPoint: string | null;
  confidence: number;
}

export function AISummaryCard({ summary }: { summary: BusinessSummaryInput }) {
  const segmentSentence = summary.personaCount > 0
    ? `We identified ${summary.personaCount} customer persona${summary.personaCount === 1 ? "" : "s"}.`
    : "No customer personas were found for this business — see the gaps below for why.";

  const opportunitySentence = summary.topPersonaName
    ? `The strongest signal points to ${summary.topPersonaName}${summary.topPainPoint ? `, driven by "${summary.topPainPoint}"` : ""}.`
    : null;

  return (
    <div className="card p-5 flex flex-col gap-3">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Business Summary</p>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm text-text-primary">{segmentSentence}</p>
        {opportunitySentence && <p className="text-sm text-text-primary">{opportunitySentence}</p>}
      </div>
      <div className="flex items-center gap-2 border-t border-border pt-3">
        <span className="text-xs text-text-muted">Overall confidence</span>
        <ConfidenceBadge score={summary.confidence} size="sm" />
      </div>
    </div>
  );
}

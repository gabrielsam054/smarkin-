import { ConfidenceBadge } from "@/components/shared/ConfidenceBadge";

/**
 * Represents a marketing audience — not a Facebook audience. "interests"
 * and "behaviors" are generic string labels; the caller decides what
 * populates them (Meta interests today, Google affinity segments or
 * TikTok interest categories tomorrow — this component has no idea which,
 * and shouldn't).
 *
 * Honest gap, stated plainly: no real capability computes this shape yet.
 * Advertising's channel adapters have real interest/behavior data
 * (matcher.ts's output), but scoped to Meta specifically and not yet
 * reshaped into this platform-agnostic contract. Built now so that
 * reshaping is the only work left when that happens — not a redesign.
 */
export interface AudienceRecommendation {
  name: string;
  confidence: number;
  interests: string[];
  behaviors: string[];
  audienceSize: string | null;      // null when the source channel doesn't estimate size
  bestStrategy: string | null;
  recommendedBudget: string | null; // caller-formatted (currency, period) — this component doesn't assume a currency
  isPrimary?: boolean;
}

export function AudienceCard({ audience }: { audience: AudienceRecommendation }) {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div>
        {audience.isPrimary && (
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1">Primary Audience</p>
        )}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-text-primary">{audience.name}</h3>
          <ConfidenceBadge score={audience.confidence} size="sm" />
        </div>
      </div>

      {audience.interests.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">Interests</p>
          <div className="flex flex-wrap gap-1.5">
            {audience.interests.map((interest, i) => (
              <span key={i} className="text-xs bg-surface-2 border border-border rounded-full px-2.5 py-1 text-text-secondary">{interest}</span>
            ))}
          </div>
        </div>
      )}

      {audience.behaviors.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">Behaviors</p>
          <div className="flex flex-wrap gap-1.5">
            {audience.behaviors.map((behavior, i) => (
              <span key={i} className="text-xs bg-surface-2 border border-border rounded-full px-2.5 py-1 text-text-secondary">{behavior}</span>
            ))}
          </div>
        </div>
      )}

      {(audience.audienceSize || audience.bestStrategy || audience.recommendedBudget) && (
        <div className="grid grid-cols-3 gap-3 border-t border-border pt-3 text-xs">
          <div>
            <p className="text-text-muted mb-0.5">Audience Size</p>
            <p className="text-text-primary font-medium">{audience.audienceSize ?? "—"}</p>
          </div>
          <div>
            <p className="text-text-muted mb-0.5">Best Strategy</p>
            <p className="text-text-primary font-medium">{audience.bestStrategy ?? "—"}</p>
          </div>
          <div>
            <p className="text-text-muted mb-0.5">Recommended Budget</p>
            <p className="text-text-primary font-medium">{audience.recommendedBudget ?? "—"}</p>
          </div>
        </div>
      )}
    </div>
  );
}

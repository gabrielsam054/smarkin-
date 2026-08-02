import { confidenceTier, CONFIDENCE_COLORS } from "@/lib/confidence";

export interface ConfidenceBreakdownItem {
  label: string;
  score: number;
}

/**
 * Takes whatever real sub-scores the caller actually has — never a fixed
 * "Business Understanding / Customer Research / Audience Research /
 * Knowledge Graph" list baked in here, since not every report will have
 * all four as real numbers (Audience Research is commonly 0 because no
 * asset exists yet, which is itself honest information worth showing,
 * not a reason to omit the whole component).
 */
export function ConfidenceMeter({ overall, breakdown }: { overall: number; breakdown: ConfidenceBreakdownItem[] }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-baseline justify-between mb-6">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Overall Confidence</p>
        <p className="text-3xl font-bold text-text-primary">{overall}%</p>
      </div>
      <div className="flex flex-col gap-4">
        {breakdown.map((item, i) => {
          const tier = confidenceTier(item.score);
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-text-secondary">{item.label}</span>
                <span className="text-sm font-semibold text-text-primary">{item.score}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${item.score}%`, backgroundColor: CONFIDENCE_COLORS[tier].stroke }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

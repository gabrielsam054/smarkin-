import { SupabaseClient } from "@supabase/supabase-js";
import { confidenceTier, confidenceLabel } from "./confidence";

export interface OutcomeAdjustedConfidence {
  score: number;
  tier: ReturnType<typeof confidenceTier>;
  label: string; // long form ("High Confidence") — for new UI, not the existing short-format column
  shortLabel: "High" | "Medium" | "Low"; // matches the existing channel_confidence column's format, which two other pages already depend on verbatim
  sampleSize: number;
  adjusted: boolean;
}

function shortLabelForTier(tier: ReturnType<typeof confidenceTier>): "High" | "Medium" | "Low" {
  return tier === "high" ? "High" : tier === "medium" ? "Medium" : "Low";
}

const MIN_SAMPLE_SIZE = 3; // matches the original design's own stated caution: "once real outcome volume exists," not on a single noisy data point
const REAL_OUTCOME_WEIGHT = 0.3; // conservative — real feedback nudges the score, doesn't override the archetype match signal entirely

/**
 * Module 8 of the requested optimization suite — the exact gap the
 * pre-existing decision_outcomes code flagged in its own comments:
 * "Does NOT yet feed back into decisionEngine.ts's confidence scoring
 * ... once real outcome volume exists, not this one." This is that
 * later step, implemented now that real volume can genuinely exist.
 *
 * Deliberately NOT wired into recommendNextAction() itself — that
 * function is a pure, deterministic, synchronous engine by design
 * (matching every other capability in this codebase), and making it
 * database-dependent would be a real architectural change, not a
 * feedback loop. This runs as a separate step after the engine
 * produces its base score, in the calling code — smaller, safer, and
 * leaves the core engine's determinism untouched.
 */
export async function adjustConfidenceFromOutcomes(
  supabase: SupabaseClient,
  matchedArchetypeId: string | null,
  recommendedChannel: string,
  baseScore: number
): Promise<OutcomeAdjustedConfidence> {
  const passthrough: OutcomeAdjustedConfidence = {
    score: baseScore, tier: confidenceTier(baseScore), label: confidenceLabel(baseScore),
    shortLabel: shortLabelForTier(confidenceTier(baseScore)),
    sampleSize: 0, adjusted: false,
  };

  if (!matchedArchetypeId) return passthrough; // nothing to look up outcomes against

  // Real outcomes for this exact archetype + channel combination — not
  // all outcomes ever recorded, which would blend in unrelated
  // recommendations and produce a misleading adjustment.
  const { data: matchingResults } = await supabase
    .from("decision_results")
    .select("id")
    .eq("matched_archetype_id", matchedArchetypeId)
    .eq("recommended_channel", recommendedChannel);

  const resultIds = (matchingResults ?? []).map((r) => r.id);
  if (resultIds.length === 0) return passthrough;

  const { data: outcomeRows } = await supabase
    .from("decision_outcomes")
    .select("outcome")
    .in("decision_result_id", resultIds);

  // Only decisive outcomes count toward the sample — "too_early_to_tell"
  // is real information (someone engaged with the reporter) but isn't a
  // verdict, and shouldn't move the score either direction.
  const decisive = (outcomeRows ?? []).filter((o) => o.outcome === "worked" || o.outcome === "did_not_work");
  if (decisive.length < MIN_SAMPLE_SIZE) {
    return { ...passthrough, sampleSize: decisive.length }; // real sample size shown even when not yet enough to act on
  }

  const workedCount = decisive.filter((o) => o.outcome === "worked").length;
  const realSuccessRateScore = (workedCount / decisive.length) * 100;

  const adjustedScore = Math.round(baseScore * (1 - REAL_OUTCOME_WEIGHT) + realSuccessRateScore * REAL_OUTCOME_WEIGHT);
  const clamped = Math.max(0, Math.min(100, adjustedScore));

  return {
    score: clamped, tier: confidenceTier(clamped), label: confidenceLabel(clamped),
    shortLabel: shortLabelForTier(confidenceTier(clamped)),
    sampleSize: decisive.length, adjusted: true,
  };
}

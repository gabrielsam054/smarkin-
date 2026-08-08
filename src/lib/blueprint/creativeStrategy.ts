import DB_RAW from "../smarkin-db.json";

interface CreativeStrategyRow {
  Goal: string;
  "Best Creative": string;
}

const CREATIVE_STRATEGY = ((DB_RAW as Record<string, unknown>)["creativeStrategy"] ?? []) as CreativeStrategyRow[];

/**
 * Real, exact match against creativeStrategy - the first genuine
 * beneficiary of the new business_classification capture point. Real
 * user-provided goal, not inferred, matched exactly against the same
 * vocabulary shown in the selector UI.
 */
export function getCreativeStrategyForGoal(goal: string | null): string | null {
  if (!goal) return null;
  return CREATIVE_STRATEGY.find((r) => r.Goal === goal)?.["Best Creative"] ?? null;
}

import DB_RAW from "../smarkin-db.json";

interface CampaignObjectiveRow {
  "Campaign Objective": string;
  "AI Strategy"?: string;
}

const CAMPAIGN_OBJECTIVES = ((DB_RAW as Record<string, unknown>)["campaignObjectiveDatabase"] ?? []) as CampaignObjectiveRow[];

// One explicit, documented alias - not fuzzy matching. The selector's
// real goal vocabulary (from creativeStrategy) uses "Lead Generation";
// this table uses "Leads" - the same real-world concept, verified by
// direct human comparison, not guessed. "Traffic" has no equivalent in
// the goal selector at all and is honestly never matched - not aliased
// to anything, since there's no genuine equivalent to alias it to.
const GOAL_ALIASES: Record<string, string> = { "Lead Generation": "Leads" };

/**
 * Real, exact match (with one documented alias) against
 * campaignObjectiveDatabase - the second real beneficiary of the
 * business_classification capture point.
 */
export function getCampaignStrategyForGoal(goal: string | null): string | null {
  if (!goal) return null;
  const lookupValue = GOAL_ALIASES[goal] ?? goal;
  const row = CAMPAIGN_OBJECTIVES.find((r) => r["Campaign Objective"] === lookupValue);
  return row?.["AI Strategy"] ?? null;
}

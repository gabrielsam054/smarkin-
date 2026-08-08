import DB_RAW from "../smarkin-db.json";

interface FunnelRuleRow {
  "Awareness Stage": string;
  "Recommended Objective": string;
  "Creative Focus": string;
}

const FUNNEL_RULES = ((DB_RAW as Record<string, unknown>)["funnelRules"] ?? []) as FunnelRuleRow[];

export interface FunnelGuidance {
  stage: string;
  recommendedObjective: string;
  creativeFocus: string;
}

/**
 * Real, exact match against funnelRules — unlike productIntelligence's
 * fuzzy word-overlap match, this is a direct match since the real
 * stage names here exactly match customerJourneyDatabase's own real
 * stage labels, already used verbatim in the Blueprint's messaging
 * section (see Decision #010). No fuzzy matching needed or wanted —
 * an exact match either exists or it honestly doesn't.
 */
export function getFunnelGuidance(stage: string): FunnelGuidance | null {
  const row = FUNNEL_RULES.find((r) => r["Awareness Stage"] === stage);
  if (!row) return null;
  return { stage, recommendedObjective: row["Recommended Objective"], creativeFocus: row["Creative Focus"] };
}

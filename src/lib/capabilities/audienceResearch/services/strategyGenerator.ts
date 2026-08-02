import DB_RAW from "../../../smarkin-db.json";

type Row = Record<string, unknown>;
const DB_ANY = DB_RAW as unknown as Record<string, Row[] | undefined>;
const AUDIENCE_STRATEGIES = (DB_ANY["audienceStrategies"] ?? []) as Row[];

function str(v: unknown): string { return v == null ? "" : String(v).trim(); }

export interface GeneratedStrategy {
  name: string;
  bestFor: string;
  funnelStage: string;
  source: string;
}

/**
 * Reads the real audienceStrategies table (6 rows) directly. That table
 * has no budget, confidence, or learning-speed columns — those fields on
 * the final TargetingStrategy type are populated as null by the Result
 * Builder rather than invented here. All 6 real strategies are returned;
 * narrowing to "the best" one or two would require funnel-stage/awareness
 * input this capability doesn't currently collect, and a false-confident
 * narrowing is worse than showing the complete real set.
 */
export function generateStrategies(gaps: string[]): { strategies: GeneratedStrategy[]; rowsUsed: number } {
  if (AUDIENCE_STRATEGIES.length === 0) {
    gaps.push("audienceStrategies reference table is empty — no targeting strategies to show.");
    return { strategies: [], rowsUsed: 0 };
  }

  const strategies = AUDIENCE_STRATEGIES.map(row => ({
    name: str(row["Strategy"]),
    bestFor: str(row["Best For"]),
    funnelStage: str(row["Funnel Stage"]),
    source: "audienceStrategies",
  })).filter(s => s.name);

  return { strategies, rowsUsed: strategies.length };
}

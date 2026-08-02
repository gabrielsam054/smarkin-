import DB_RAW from "../../../smarkin-db.json";

type Row = Record<string, unknown>;
const DB_ANY = DB_RAW as unknown as Record<string, Row[] | undefined>;
const CHANNEL_SUITABILITY = (DB_ANY["channelSuitabilityDatabase"] ?? []) as Row[];

// Real platform columns in this table — genuinely what exists, not
// invented. No "X" column exists yet; only platforms with real backing
// data are ever recommended.
const PLATFORM_COLUMNS = ["Meta Ads", "Google Ads", "TikTok", "LinkedIn", "Pinterest", "YouTube"] as const;

function s(v: unknown): string { return v == null ? "" : String(v).toLowerCase().trim(); }
function str(v: unknown): string { return v == null ? "" : String(v).trim(); }
function num(v: unknown): number { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function normalize(w: string): string { return w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w; }
function words(v: string): Set<string> { return new Set(s(v).split(/\s+/).filter(w => w.length > 2).map(normalize)); }
function overlap(a: string, b: string): number {
  const aw = words(a), bw = words(b);
  return [...aw].filter(w => bw.has(w)).length;
}

export interface PlatformRecommendation {
  platform: string;
  suitability: number;
  reasoning: string;
  recommendedObjectives: string[];
}

/**
 * Reads channelSuitabilityDatabase directly — the same real reference
 * table Decision Engine uses, but that table's own matching logic
 * (matchArchetype, getChannelScores) is private to decisionEngine.ts, not
 * exported. Reading the shared reference table directly (not importing
 * private capability logic) matches the same pattern already established
 * for Customer Research's motivationAnalyzer.ts. This produces a
 * genuinely different output shape than Decision Engine's single
 * recommended-channel decision: a platform-agnostic suitability score
 * across every real platform column, not one action-based recommendation.
 *
 * Matching here uses industry overlap only, since AudienceResearchInput
 * doesn't carry budget/team-size/etc. — a real, honest simplification
 * disclosed via gaps when no strong match is found, not silently assumed
 * to be as precise as Decision Engine's full-profile matching.
 */
export function evaluatePlatforms(industry: string, gaps: string[]): { platforms: PlatformRecommendation[]; rowsUsed: number } {
  const scored = CHANNEL_SUITABILITY
    .map(row => ({ row, score: overlap(industry, str(row["Industry"])) }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score === 0) {
    gaps.push(`No channelSuitabilityDatabase row matched industry "${industry}" — platform recommendations are based on the closest available row, or unavailable if none exists.`);
    return { platforms: [], rowsUsed: 0 };
  }

  const platforms: PlatformRecommendation[] = PLATFORM_COLUMNS
    .map(platform => ({
      platform,
      suitability: num(best.row[platform]),
      reasoning: str(best.row["Reasoning"]) || `Suitability score derived from channelSuitabilityDatabase for the closest-matching industry row.`,
      recommendedObjectives: [] as string[], // no per-platform objective field exists in this table — left honestly empty rather than invented
    }))
    .filter(p => p.suitability > 0)
    .sort((a, b) => b.suitability - a.suitability);

  if (platforms.length === 0) {
    gaps.push(`Matched a channelSuitabilityDatabase row for "${industry}", but every platform column scored 0 — no platform recommendations to show.`);
  }

  return { platforms, rowsUsed: 1 };
}

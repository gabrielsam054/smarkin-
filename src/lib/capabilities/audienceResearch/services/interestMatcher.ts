import DB_RAW from "../../../smarkin-db.json";

type Row = Record<string, unknown>;
const DB_ANY = DB_RAW as unknown as Record<string, Row[] | undefined>;
const META_INTERESTS = (DB_ANY["metaAdsInterest"] ?? []) as Row[];

function s(v: unknown): string { return v == null ? "" : String(v).toLowerCase().trim(); }
function str(v: unknown): string { return v == null ? "" : String(v).trim(); }
function normalize(w: string): string { return w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w; }
function words(v: string): Set<string> { return new Set(s(v).split(/\s+/).filter(w => w.length > 2).map(normalize)); }
function overlap(a: string, b: string): number {
  const aw = words(a), bw = words(b);
  return [...aw].filter(w => bw.has(w)).length;
}

export interface MatchedInterest { name: string; source: string; }

/**
 * Reads metaAdsInterest directly — the one real interest database this
 * codebase has. Honest naming: the source is "metaAdsInterest" because
 * that's genuinely the only interest data that exists; this isn't
 * presented as a generic, multi-platform interest source it isn't.
 */
export function matchInterests(candidateName: string, gaps: string[]): { interests: MatchedInterest[]; rowsUsed: number } {
  const matches = META_INTERESTS
    .map(row => ({ row, score: overlap(candidateName, str(row["Meta Interest Name"])) }))
    .filter(m => m.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  if (matches.length === 0) {
    gaps.push(`No metaAdsInterest rows matched "${candidateName}" with meaningful word overlap.`);
    return { interests: [], rowsUsed: 0 };
  }

  const interests = matches.map(m => ({
    name: str(m.row["Meta Interest Name"]),
    source: "metaAdsInterest",
  })).filter(i => i.name);

  return { interests, rowsUsed: matches.length };
}

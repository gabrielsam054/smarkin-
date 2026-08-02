import DB_RAW from "../../../smarkin-db.json";

type Row = Record<string, unknown>;
const DB_ANY = DB_RAW as unknown as Record<string, Row[] | undefined>;
const BEHAVIORS = (DB_ANY["behaviors"] ?? []) as Row[];

function s(v: unknown): string { return v == null ? "" : String(v).toLowerCase().trim(); }
function str(v: unknown): string { return v == null ? "" : String(v).trim(); }

export interface MatchedBehavior { name: string; category: string; source: string; }

/**
 * Reads the real behaviors table (189 rows) directly, matching against its
 * own Match Keywords field (semicolon-separated, e.g. "lives abroad;
 * expat") rather than generic word overlap — this table already encodes
 * exactly which phrases should trigger a match, so using that real field
 * beats reinventing a weaker overlap heuristic.
 */
export function matchBehaviors(candidateName: string, candidateDescription: string, gaps: string[]): { behaviors: MatchedBehavior[]; rowsUsed: number } {
  const searchText = s(`${candidateName} ${candidateDescription}`);

  const matches = BEHAVIORS.filter(row => {
    const keywords = str(row["Match Keywords"]).toLowerCase().split(";").map(k => k.trim()).filter(Boolean);
    return keywords.some(k => k.length > 2 && searchText.includes(k));
  }).slice(0, 6);

  if (matches.length === 0) {
    gaps.push(`No behaviors rows matched "${candidateName}" against real Match Keywords.`);
    return { behaviors: [], rowsUsed: 0 };
  }

  const behaviors = matches.map(row => ({
    name: str(row["Meta Audience"] ?? row["Attribute"]),
    category: str(row["Category"]),
    source: "behaviors",
  })).filter(b => b.name);

  return { behaviors, rowsUsed: matches.length };
}

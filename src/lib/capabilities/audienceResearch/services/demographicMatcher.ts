import DB_RAW from "../../../smarkin-db.json";

type Row = Record<string, unknown>;
const DB_ANY = DB_RAW as unknown as Record<string, Row[] | undefined>;
const DEMOGRAPHICS = (DB_ANY["demographicDatabase"] ?? []) as Row[];

function s(v: unknown): string { return v == null ? "" : String(v).toLowerCase().trim(); }
function str(v: unknown): string { return v == null ? "" : String(v).trim(); }
function normalize(w: string): string { return w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w; }
function words(v: string): Set<string> { return new Set(s(v).split(/\s+/).filter(w => w.length > 2).map(normalize)); }
function overlap(a: string, b: string): number {
  const aw = words(a), bw = words(b);
  return [...aw].filter(w => bw.has(w)).length;
}

export interface MatchedDemographic {
  name: string; category: string; sizeMin: number | null; sizeMax: number | null; region: string | null; source: string;
}

/**
 * Reads the real demographicDatabase (111 rows) directly — this is the
 * one real source of genuine audience-size numbers in this codebase.
 * AudienceSize is only ever populated from an actual matched row here,
 * never estimated or invented when nothing matches.
 */
export function matchDemographics(candidateName: string, candidateDescription: string, gaps: string[]): { demographics: MatchedDemographic[]; rowsUsed: number } {
  const searchText = `${candidateName} ${candidateDescription}`;

  const matches = DEMOGRAPHICS
    .map(row => ({ row, score: overlap(searchText, `${str(row["Demographic Name"])} ${str(row["Category"])} ${str(row["Subcategory"])}`) }))
    .filter(m => m.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (matches.length === 0) {
    gaps.push(`No demographicDatabase rows matched "${candidateName}" — audience size for this candidate is unavailable, not estimated.`);
    return { demographics: [], rowsUsed: 0 };
  }

  const demographics = matches.map(m => ({
    name: str(m.row["Demographic Name"]),
    category: str(m.row["Category"]),
    sizeMin: typeof m.row["Audience Size Min"] === "number" ? m.row["Audience Size Min"] as number : null,
    sizeMax: typeof m.row["Audience Size Max"] === "number" ? m.row["Audience Size Max"] as number : null,
    region: str(m.row["Region"]) || null,
    source: "demographicDatabase",
  }));

  return { demographics, rowsUsed: matches.length };
}

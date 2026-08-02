/**
 * Language Analyzer — reads keywordMappingDatabase (3,452 real rows) for
 * search queries and phrasing matching the product, using the same
 * overlap-based matching discipline (minimum shared-word threshold) already
 * proven in businessIntelligenceEngine.ts to avoid single-incidental-word
 * false positives.
 */
import { BusinessIntelligenceProfile } from "../../../businessIntelligenceEngine";
import { CustomerLanguage } from "../types";
import DB_RAW from "../../../smarkin-db.json";

type Row = Record<string, unknown>;
const DB_ANY = DB_RAW as unknown as Record<string, Row[] | undefined>;
const KEYWORD_DB = (DB_ANY["keywordMappingDatabase"] ?? []) as Row[];

function s(v: unknown): string { return v == null ? "" : String(v).toLowerCase().trim(); }
function str(v: unknown): string { return v == null ? "" : String(v).trim(); }
function normalize(w: string): string { return w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w; }
function words(v: string): Set<string> { return new Set(s(v).split(/\s+/).filter(w => w.length > 2).map(normalize)); }
function overlap(a: string, b: string): number {
  const aw = words(a), bw = words(b);
  return [...aw].filter(w => bw.has(w)).length;
}

export function analyzeLanguage(
  profile: BusinessIntelligenceProfile,
  gaps: string[],
): { languagePatterns: CustomerLanguage; searchIntentExtra: string[]; rowsUsed: number } {
  const q = s(profile.input.productName);
  const matches = KEYWORD_DB
    .map(row => ({ row, score: overlap(q, str(row["Primary Keyword"])) }))
    .filter(m => m.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .map(m => m.row);

  if (matches.length === 0) {
    gaps.push(`No keywordMappingDatabase rows matched "${profile.input.productName}" with meaningful word overlap — Customer Language section is empty.`);
    return {
      languagePatterns: { frequentPhrases: [], commonQuestions: [], searchQueries: [], commonWording: [] },
      searchIntentExtra: [],
      rowsUsed: 0,
    };
  }

  const searchQueries = [...new Set(matches.map(r => str(r["Primary Keyword"])).filter(Boolean))];
  const alternativeKeywords = [...new Set(matches.flatMap(r => str(r["Alternative Keywords"]).split(",").map(x => x.trim()).filter(Boolean)))];
  const searchIntentTypes = [...new Set(matches.map(r => str(r["Search Intent Type"])).filter(Boolean))];

  return {
    languagePatterns: {
      frequentPhrases: alternativeKeywords.slice(0, 15),
      commonQuestions: [], // keywordMappingDatabase has no question-form field — honestly empty here, covered by journeyMapper's customerquestions instead
      searchQueries,
      commonWording: [...new Set(matches.map(r => str(r["Customer Search Intent"])).filter(Boolean))],
    },
    searchIntentExtra: searchIntentTypes,
    rowsUsed: matches.length,
  };
}

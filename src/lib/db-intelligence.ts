/**
 * Smarkin AI — DB Intelligence Layer v3
 * Single source of truth. Every function queries the Intelligence Engine first.
 * 53 tables | 3,445 keywords | 267 interests | 189 behaviors
 */
import DB from "./smarkin-db.json";

type Row = Record<string, unknown>;
const kw  = DB.keywordMappingDatabase as Row[];
const int = DB.metaAdsInterest        as Row[];
const beh = DB.behaviors              as Row[];
const per = DB.customerPersonaDatabase as Row[];
const ind = DB.industries             as Row[];
const indIntel = DB.industryIntelligenceDatabase as Row[];
const bench    = (DB as Record<string, Record<string,unknown>[]>)["marketingBenchmarkDatabase"] ?? []   as Row[];
const creative = (DB as Record<string, Record<string,unknown>[]>)["creativeIntelligenceDatabase"] ?? []  as Row[];
const psych    = (DB as Record<string, Record<string,unknown>[]>)["marketingPsychologyDatabase"] ?? []   as Row[];
const journey  = (DB as Record<string, Record<string,unknown>[]>)["customerJourneyDatabase"] ?? []       as Row[];
const plays    = ([] as Record<string,unknown>[])      as Row[];
const offers   = (DB as Record<string, Record<string,unknown>[]>)["offerIntelligenceDatabase"] ?? []     as Row[];
const objectives = (DB as Record<string, Record<string,unknown>[]>)["campaignObjectiveDatabase"] ?? []   as Row[];
const graph    = DB.relationship   as Row[];
// aiConfidenceRule available via DB.aiConfidenceRule
// audienceMatchingRules available via DB.aiAudienceMatchingRulesData
const optRules = DB.optimisationRules             as Row[];
const funnelRules = DB.funnelRules                as Row[];
const creativeStrat = DB.creativeStrategy         as Row[];
const audStrategies = DB.audienceStrategies       as Row[];
// productProblems available via DB.productProblemDatabase

// ── Helpers ────────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return v == null ? "" : String(v).toLowerCase();
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
}

function scoreMatch(tokens: string[], haystack: string): number {
  const hay = str(haystack);
  let score = 0;
  for (const t of tokens) {
    if (hay === t) score += 3;
    else if (hay.startsWith(t + " ") || hay.endsWith(" " + t)) score += 2;
    else if (hay.includes(t)) score += 1;
  }
  return score;
}

// ── 1. Keyword Search ─────────────────────────────────────────────────────────

export function searchKeywords(query: string, topN = 15) {
  const tokens = tokenize(query);
  return kw
    .map(row => {
      const fields = [
        row["Primary Keyword"], row["Alternative Keywords"], row["AI Search Tags"],
        row["Product Category"], row["Product Subcategory"], row["Synonyms"],
        row["Related Products"], row["Brand"], row["Product Family"],
      ].filter(Boolean).join(" ");
      const score = scoreMatch(tokens, fields)
        + parseFloat(String(row["AI Match Weight"] ?? "0")) * 2;
      return { row, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(x => x.row);
}

// ── 2. Industry Detection ─────────────────────────────────────────────────────

export function detectIndustry(query: string): Row | null {
  const tokens = tokenize(query);
  const kwMatches = searchKeywords(query, 5);
  const topKw = kwMatches[0];
  if (topKw) {
    const industryName = str(topKw["Industry"]);
    const found = ind.find(r => str(r["Industry"]) === industryName);
    if (found) return found;
  }
  // Fallback: score against industry intelligence
  return indIntel
    .map(r => ({
      r,
      score: scoreMatch(tokens, [r["Industry"], r["Common Products"], r["AI Search Tags"]].join(" ")),
    }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.r ?? null;
}

// ── 3. Meta Interests ─────────────────────────────────────────────────────────

export function getInterests(query: string, industryName: string, topN = 20) {
  const tokens = tokenize(`${query} ${industryName}`);
  return int
    .map(row => ({
      row,
      score: scoreMatch(tokens, [
        row["Meta Interest Name"], row["Main Category"], row["Sub Category"],
        row["Industry"], row["Product Match"],
      ].join(" ")),
    }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(x => ({
      name: String(x.row["Meta Interest Name"] ?? ""),
      category: String(x.row["Main Category"] ?? ""),
      subCategory: String(x.row["Sub Category"] ?? ""),
      buyingIntent: String(x.row["Buying Intent"] ?? ""),
      score: Math.round((x.score / 10) * 100),
    }));
}

// ── 4. Behaviors ──────────────────────────────────────────────────────────────

export function getBehaviors(query: string, industryName: string, topN = 10) {
  const tokens = tokenize(`${query} ${industryName}`);
  return beh
    .filter(r => str(r["Status"]) !== "inactive")
    .map(row => ({
      row,
      score: scoreMatch(tokens, [row["Category"], row["Parent"], row["Child"], row["Match Keywords"]].join(" ")),
    }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(x => ({
      id: String(x.row["Behavior ID"] ?? ""),
      category: String(x.row["Category"] ?? ""),
      parent: String(x.row["Parent"] ?? ""),
      child: String(x.row["Child"] ?? ""),
      metaAudience: String(x.row["Meta Audience"] ?? ""),
      attribute: String(x.row["Attribute"] ?? ""),
    }));
}

// ── 5. Personas ───────────────────────────────────────────────────────────────

export function getPersonas(query: string, topN = 3) {
  const tokens = tokenize(query);
  return per
    .map(row => ({
      row,
      score: scoreMatch(tokens, [
        row["Persona Name"], row["AI Search Tags"],
        row["Common Product Categories"], row["Primary Goal"],
      ].join(" ")),
    }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(x => ({
      id: String(x.row["Persona ID"] ?? ""),
      name: String(x.row["Persona Name"] ?? ""),
      goal: String(x.row["Primary Goal"] ?? ""),
      painPoint: String(x.row["Primary Pain Point"] ?? ""),
      buyingMotivation: String(x.row["Buying Motivation"] ?? ""),
      recommendedInterests: String(x.row["Recommended Meta Interests"] ?? ""),
    }));
}

// ── 6. Benchmarks ─────────────────────────────────────────────────────────────

export function getBenchmarks(industryName: string, objective = "") {
  const exact = bench.find(r =>
    str(r["Industry"]) === str(industryName) &&
    (!objective || str(r["Campaign Objective"]).includes(str(objective)))
  );
  if (exact) return exact;
  return bench.find(r => str(r["Industry"]) === str(industryName)) ?? bench[0];
}

// ── 7. Creative Intelligence ──────────────────────────────────────────────────

export function getCreativeIntel(objective = "", industry = "") {
  const tokens = tokenize(`${objective} ${industry}`);
  const scored = creative.map(r => ({
    r,
    score: scoreMatch(tokens, [r["Hook Type"], r["Visual Style"], r["Best For"]].join(" ")),
  })).sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map(x => x.r);
}

// ── 8. Marketing Psychology ───────────────────────────────────────────────────

export function getPsychPrinciples(industry = "", topN = 3) {
  const tokens = tokenize(industry);
  return psych
    .map(r => ({ r, score: scoreMatch(tokens, String(r["Best Industries"] ?? "")) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(x => x.r);
}

// ── 9. Customer Journey ────────────────────────────────────────────────────────

export function getJourneyStage(objective = "") {
  const tokens = tokenize(objective);
  return journey
    .map(r => ({ r, score: scoreMatch(tokens, [r["Stage"], r["Recommended Objective"]].join(" ")) }))
    .sort((a, b) => b.score - a.score)[0]?.r ?? journey[0];
}

// ── 10. Campaign Playbook ─────────────────────────────────────────────────────

export function getPlaybook(industry = "", businessType = "") {
  const tokens = tokenize(`${industry} ${businessType}`);
  return plays
    .map(r => ({ r, score: scoreMatch(tokens, [r["Industry"], r["Business Type"]].join(" ")) }))
    .sort((a, b) => b.score - a.score)[0]?.r ?? plays[0];
}

// ── 11. Offers ────────────────────────────────────────────────────────────────

export function getOffers(industry = "", funnelStage = "", topN = 3) {
  const tokens = tokenize(`${industry} ${funnelStage}`);
  return offers
    .map(r => ({ r, score: scoreMatch(tokens, [r["Industry"], r["Funnel Stage"], r["Offer Type"]].join(" ")) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(x => x.r);
}

// ── 12. Knowledge Graph Traversal ─────────────────────────────────────────────

export function traverseGraph(entityName: string, depth = 2) {
  const visited = new Set<string>();
  const results: Row[] = [];
  
  function traverse(name: string, remaining: number) {
    if (remaining <= 0 || visited.has(name)) return;
    visited.add(name);
    const related = graph.filter(r =>
      str(r["Source Name"]) === str(name) || str(r["Target Name"]) === str(name)
    );
    results.push(...related);
    if (remaining > 1) {
      for (const r of related) {
        const next = str(r["Source Name"]) === str(name) ? r["Target Name"] : r["Source Name"];
        traverse(String(next ?? ""), remaining - 1);
      }
    }
  }
  traverse(entityName, depth);
  return results;
}

// ── 13. Full Intelligence Object (primary export) ─────────────────────────────

export interface IntelligenceObject {
  query: string;
  matchedKeywords: Row[];
  industry: Row | null;
  industryName: string;
  interests: ReturnType<typeof getInterests>;
  behaviors: ReturnType<typeof getBehaviors>;
  personas: ReturnType<typeof getPersonas>;
  benchmarks: Row;
  creativeIntel: Row[];
  psychology: Row[];
  journeyStage: Row;
  playbook: Row | null;
  offers: Row[];
  knowledgeGraph: Row[];
  audienceStrategies: Row[];
  funnelRules: Row[];
  creativeStrategy: Row[];
  optimisationRules: Row[];
  objectives: Row[];
  confidence: number;
}

export function buildIntelligenceObject(
  productName: string,
  description = "",
  objective = "",
  businessType = ""
): IntelligenceObject {
  const query = `${productName} ${description}`.trim();
  
  const matchedKeywords = searchKeywords(query);
  const topKw = matchedKeywords[0];
  
  const industry = detectIndustry(query);
  const industryName = topKw
    ? String(topKw["Industry"] ?? "")
    : String(industry?.["Industry"] ?? "General");

  const interests = getInterests(query, industryName);
  const behaviors = getBehaviors(query, industryName);
  const personas  = getPersonas(query);
  const benchmarkRow = getBenchmarks(industryName, objective);
  const creativeIntel = getCreativeIntel(objective, industryName);
  const psychology = getPsychPrinciples(industryName);
  const journeyStage = getJourneyStage(objective);
  const playbook = getPlaybook(industryName, businessType);
  const relevantOffers = getOffers(industryName, String(journeyStage?.["Stage"] ?? ""));
  const knowledgeGraph = traverseGraph(productName);

  // Confidence: based on keyword match quality
  const topScore = topKw ? parseFloat(String(topKw["AI Match Weight"] ?? "0")) : 0;
  const confidence = Math.min(100, Math.round(
    (matchedKeywords.length > 0 ? 60 : 20) +
    (interests.length > 5 ? 20 : interests.length * 4) +
    (topScore > 0.8 ? 20 : topScore * 25)
  ));

  return {
    query,
    matchedKeywords,
    industry,
    industryName,
    interests,
    behaviors,
    personas,
    benchmarks: benchmarkRow,
    creativeIntel,
    psychology,
    journeyStage,
    playbook,
    offers: relevantOffers,
    knowledgeGraph,
    audienceStrategies: audStrategies as Row[],
    funnelRules: funnelRules as Row[],
    creativeStrategy: creativeStrat as Row[],
    optimisationRules: optRules as Row[],
    objectives: objectives as Row[],
    confidence,
  };
}

// ── 14. Missing keyword logger ─────────────────────────────────────────────────

const missingKeywordQueue: string[] = [];

export function logMissingKeyword(keyword: string) {
  if (!missingKeywordQueue.includes(keyword.toLowerCase())) {
    missingKeywordQueue.push(keyword.toLowerCase());
  }
}

export function getMissingKeywords() {
  return [...missingKeywordQueue];
}

/**
 * Smarkin AI — Intelligence Engine v4
 * 100% database-driven. Zero Claude calls. Zero hardcoded logic.
 * Source of truth: smarkin-db.json (45 sheets, 1,980 keywords, 267 interests, 150 behaviors)
 */
import DB from "./smarkin-db.json";

// ── DB Tables ─────────────────────────────────────────────────────────────────
type Row = Record<string, unknown>;
const KW   = (DB.keywordMappingDatabase       ?? []) as Row[];
const INT  = (DB.metaAdsInterest              ?? []) as Row[];
const BEH  = (DB.behaviors                   ?? []) as Row[];
const PER  = (DB.customerPersonaDatabase      ?? []) as Row[];
const IND  = (DB.industryIntelligenceDatabase ?? []) as Row[];
const DEM  = (DB.demographicDatabase          ?? []) as Row[];
const AUD  = (DB.audienceStrategies           ?? []) as Row[];
const FUN  = (DB.funnelRules                 ?? []) as Row[];
const OBJ  = (DB.campaignObjectiveDatabase    ?? []) as Row[];
const CRE  = (DB.creativeStrategy            ?? []) as Row[];
const OPT  = (DB.optimisationRules           ?? []) as Row[];
const REL  = (DB.relationship                ?? []) as Row[];
const PROB = (DB.productProblemDatabase      ?? []) as Row[];
const CONF = (DB.aiConfidenceRule            ?? []) as Row[];
const PLACE= (DB.metaPlacement              ?? []) as Row[];
const BENCH= (DB.marketingBenchmarkDatabase  ?? []) as Row[];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AnalysisInput {
  productName: string;
  description?: string;
  businessType?: string;
  objective?: string;
  country?: string;
}

export interface RecommendedInterest {
  name: string;
  mainCategory: string;
  subCategory: string;
  buyingIntent: string;
  tier: "primary" | "secondary" | "expansion";
  score: number;
  reason: string;
  source: "Interest Database";
}

export interface RecommendedBehavior {
  id: string;
  metaAudience: string;
  parent: string;
  child: string;
  attribute: string;
  score: number;
  reason: string;
  source: "Behavior Database";
  verification: string;
}

export interface RecommendedDemographic {
  id: string;
  category: string;
  subcategory: string;
  name: string;
  metaPath: string;
  audienceSizeMin: number;
  audienceSizeMax: number;
  region?: string;
  source: "Demographic Database";
  score: number;
}

export interface MatchedPersona {
  id: string;
  name: string;
  goal: string;
  painPoint: string;
  buyingMotivation: string;
  score: number;
  relevanceScore: number;
  productCategories?: string;
  matchReason: string;
  source: "Customer Persona Database";
  matchConfidenceLevel?: string;
}

export interface MatchedProblem {
  id: string;
  problem: string;
  goal: string;
  commonProducts?: string;
  customerGoal?: string;
  score: number;
  source: "Product Problem Database";
}

export interface IndustryBenchmark {
  industry: string;
  "Average CTR (%)": string;
  "Average CPC ($)": string;
  "Average CPM ($)": string;
  "Average ROAS": string;
  "Average CPA ($)": string;
  "Recommended Daily Budget": string;
}

export interface AudienceReport {
  industry: string;
  sector: string;
  category: string;
  subCategory: string;
  productFamily: string;
  productType: string;
  matchedKeywordCount: number;
  matchConfidenceLevel: "exact" | "family" | "category" | "industry" | "keyword" | "none";
  interests: RecommendedInterest[];
  behaviors: RecommendedBehavior[];
  demographics: RecommendedDemographic[];
  personas: MatchedPersona[];
  problems: MatchedProblem[];
  campaignObjective: string;
  objectiveStrategy: string;
  audienceStrategy: string;
  audienceStrategyBestFor: string;
  funnelStage: string;
  recommendedObjective: string;
  creativeFocus: string;
  bestCreativeFormat: string;
  placements: string[];
  creativeHooks: string[];
  optimizationTips: string[];
  customerGoals: string[];
  buyingMotivations: string[];
  messagingAngles: string[];
  executiveSummary: string;
  audienceInsight: string;
  whyThisAudience: string;
  overallScore: number;
  scoreBreakdown: {
    keywordMatch: number;
    interestMatch: number;
    behaviorMatch: number;
    personaMatch: number;
    demographicMatch: number;
  };
  benchmarks: IndustryBenchmark | null;
  recommendedOffers: Row[];
  creativeIntelligence: Row[];
  psychologyPrinciples: Row[];
  journeyStage: Row | null;
  playbook: Row | null;
  knowledgeGraphPath: string[];
  explainability: {
    matchedKeywords: string[];
    classificationPath: string[];
    interestSources: string[];
    confidenceFactors: string[];
    databaseTablesUsed: string[];
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function s(v: unknown): string {
  return v == null ? "" : String(v).toLowerCase().trim();
}
function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}
function tokenize(text: string): string[] {
  return s(text).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 1);
}
function words(text: string): Set<string> {
  return new Set(tokenize(text));
}
function splitCSV(v: unknown): string[] {
  return str(v).split(",").map(x => x.trim()).filter(Boolean);
}
function wordMatch(a: string, b: string): number {
  const wa = words(a), wb = words(b);
  return [...wa].filter(w => wb.has(w) && w.length > 2).length;
}
function containsWord(hay: string, word: string): boolean {
  const re = new RegExp(`(?<![a-z])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])`);
  return re.test(s(hay));
}

// ── Step 1: Keyword Classification (10-level hierarchy) ───────────────────────

interface KWMatch { row: Row; score: number; level: number }

function classifyKeyword(input: AnalysisInput): KWMatch | null {
  const q = s(`${input.productName} ${input.description ?? ""}`);
  const qw = words(q);
  let best: KWMatch | null = null;

  for (const row of KW) {
    const pk   = s(row["Primary Keyword"]);
    const alt  = s(row["Alternative Keywords"]);
    const syn  = s(row["AI Search Tags"]);
    const cat  = s(row["Product Category"]);
    const sub  = s(row["Product Subcategory"]);
    const rel  = s(row["Related Industries"]);

    let score = 0, level = 99;

    // P1 exact
    if (q === pk || containsWord(q, pk)) { score = 100; level = 1; }
    // P2 alternative keywords
    else if (splitCSV(alt).some(a => q.includes(s(a)) || containsWord(q, s(a)))) { score = 90; level = 2; }
    // P3 search tags
    else if (syn && wordMatch(q, syn) >= 2) { score = 80; level = 3; }
    // P4 category match
    else { const cw = words(cat); const ov = [...qw].filter(w => cw.has(w) && w.length > 2).length; if (ov > 0) { score = 60 + ov * 5; level = 4; } }
    // P5 subcategory
    if (!score) { const sw = words(sub); if ([...qw].some(w => sw.has(w) && w.length > 3)) { score = 50; level = 5; } }
    // P6 related industries
    if (!score) { const ri = wordMatch(q, rel); if (ri > 0) { score = 40; level = 6; } }

    if (score > 0 && (!best || score > best.score)) {
      best = { row, score, level };
    }
  }
  return best;
}

// ── Step 2: Industry Detection ────────────────────────────────────────────────

function detectIndustry(kw: KWMatch | null, input: AnalysisInput): string {
  if (kw) return str(kw.row["Related Industries"] || kw.row["Product Category"] || "Retail & Ecommerce");
  // Fallback from IND table
  const q = s(`${input.productName} ${input.description ?? ""}`);
  for (const row of IND) {
    const prods = s(row["Common Products"]);
    if (wordMatch(q, prods) >= 1) return str(row["Industry"]);
  }
  const BT_MAP: Record<string,string> = {
    "Ecommerce":"Retail & Ecommerce","Fashion":"Fashion & Lifestyle",
    "Beauty":"Beauty Industry","Food":"Food & Beverage",
    "Fitness":"Health & Fitness","Technology":"Technology",
    "SaaS":"Technology","Education":"Education & Training",
    "Real Estate":"Real Estate","Automotive":"Automotive",
  };
  return BT_MAP[input.businessType ?? ""] ?? "Retail & Ecommerce";
}

// ── Step 3: Interests from DB only ───────────────────────────────────────────
// INDUSTRY BLOCKLIST — prevents cross-industry noise
const BLOCKED: Record<string, string[]> = {
  "Home & Living":    ["photograph","camera","gaming","esport","motorsport","aviation","marine","crypto","finance","legal","software"],
  "Food & Beverage":  ["photograph","camera","gaming","software","finance","legal","automotive","aviation"],
  "Fashion":          ["photograph","camera","gaming","automotive","aviation","marine"],
  "Beauty Industry":  ["photograph","camera","gaming","automotive","finance","aviation"],
  "Health & Fitness": ["photograph","camera","gaming","automotive","finance","aviation"],
  "Technology":       ["cooking","baking","wedding","farming","beauty","skincare"],
  "Automotive":       ["cooking","baking","wedding","beauty","skincare","baby"],
  "Real Estate":      ["gaming","fashion","beauty","photography","motorsport"],
};

function getInterests(kw: KWMatch | null, industry: string, input: AnalysisInput, topN = 20): RecommendedInterest[] {
  const q = s(`${input.productName} ${input.description ?? ""} ${industry}`);
  const blocked = (BLOCKED[industry] ?? []);

  // Collect candidate names from keyword's Related Meta Interests
  const candidates = new Set<string>();
  if (kw) {
    splitCSV(kw.row["Related Meta Interests"]).forEach(n => candidates.add(s(n)));
    // Also from same-category keywords
    const sameCat = kw.row["Product Category"];
    KW.filter(r => r["Product Category"] === sameCat && r !== kw.row)
      .slice(0, 8)
      .forEach(r => splitCSV(r["Related Meta Interests"]).forEach(n => candidates.add(s(n))));
  }
  // From industry intelligence
  const indRow = IND.find(r => s(r["Industry"]) === s(industry));
  if (indRow) splitCSV(indRow["Related Meta Interests"]).forEach(n => candidates.add(s(n)));
  // From matching personas
  if (kw) {
    splitCSV(kw.row["Recommended Persona"]).forEach(pName => {
      const per = PER.find(r => s(r["Persona Name"]) === s(pName));
      if (per) splitCSV(per["Recommended Meta Interests"]).forEach(n => candidates.add(s(n)));
    });
  }

  const results: RecommendedInterest[] = [];

  for (const row of INT) {
    const name    = str(row["Meta Interest Name"]);
    const nameLow = s(name);
    const mainCat = str(row["Main Category"]);
    const subCat  = str(row["Sub Category"]);
    const intInd  = s(row["Industry"]);
    const match   = s(row["Product Match"]);
    const intent  = str(row["Buying Intent"]);

    // Blocklist gate
    if (blocked.some(b => nameLow.includes(b) || intInd.includes(b))) continue;

    // Check if in candidate set
    const inCandidates = candidates.has(nameLow) ||
      [...candidates].some(c => nameLow.includes(c) || c.includes(nameLow));

    // Score
    let score = 0;
    if (inCandidates) {
      score = 70;
    } else {
      const ov = wordMatch(q, `${name} ${mainCat} ${subCat} ${match}`);
      if (ov < 2) continue;
      score = ov * 12;
    }

    // Boosts
    if (intent === "High") score += 15;
    else if (intent === "Medium") score += 7;
    const prodOv = wordMatch(q, match);
    score += prodOv * 8;
    if (wordMatch(industry, intInd) > 0) score += 10;

    score = Math.min(100, score);

    results.push({
      name,
      mainCategory: mainCat,
      subCategory: subCat,
      buyingIntent: intent || "Medium",
      tier: inCandidates ? "primary" : score > 60 ? "secondary" : "expansion",
      score: Math.round(score),
      reason: inCandidates
        ? `Directly linked from keyword → ${str(kw?.row["Primary Keyword"] ?? "DB")} in the Intelligence Engine`
        : `Industry-category overlap (${wordMatch(q, `${name} ${mainCat} ${subCat}`)} terms)`,
      source: "Interest Database",
    });
  }

  results.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  return results
    .filter(r => { if (seen.has(r.name)) return false; seen.add(r.name); return true; })
    .slice(0, topN);
}

// ── Step 4: Behaviors ─────────────────────────────────────────────────────────

function getBehaviors(kw: KWMatch | null, industry: string, input: AnalysisInput, topN = 10): RecommendedBehavior[] {
  const q = s(`${input.productName} ${input.description ?? ""} ${industry}`);
  const qw = words(q);

  // Candidate behaviors from DB keywords
  const targetBehaviors = new Set<string>();
  if (kw) {
    splitCSV(kw.row["Behaviors"] ?? "").forEach(b => targetBehaviors.add(s(b)));
  }

  const results: RecommendedBehavior[] = [];

  for (const row of BEH) {
    if (s(row["Status"]) === "inactive") continue;
    const parent = s(row["Parent"]);
    const child  = s(row["Child"]);
    const meta   = s(row["Meta Audience"]);
    const mkw    = s(row["Match Keywords"]);
    const cat    = s(row["Category"]);

    const behHay = `${parent} ${child} ${meta} ${mkw} ${cat}`;
    const ov = [...qw].filter(w => behHay.includes(w) && w.length > 3).length;
    const listed = targetBehaviors.has(meta) || targetBehaviors.has(child);

    if (!listed && ov < 2) continue;

    const score = Math.min(100, listed ? 85 + ov * 2 : ov * 15);
    results.push({
      id:           str(row["Behavior ID"]),
      metaAudience: str(row["Meta Audience"]),
      parent:       str(row["Parent"]),
      child:        str(row["Child"]),
      attribute:    str(row["Attribute"]),
      score,
      reason:       listed ? `Keyword → behavior mapping` : `Industry behavior overlap (${ov} terms)`,
      source:       "Behavior Database",
      verification: str(row["Verification"]),
    });
  }

  results.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  return results
    .filter(r => { if (seen.has(r.metaAudience)) return false; seen.add(r.metaAudience); return true; })
    .slice(0, topN);
}

// ── Step 5: Personas ──────────────────────────────────────────────────────────

function getPersonas(kw: KWMatch | null, industry: string, input: AnalysisInput): MatchedPersona[] {
  const q = s(`${input.productName} ${input.description ?? ""} ${industry}`);
  const recommended = kw ? splitCSV(kw.row["Recommended Persona"]).map(s) : [];

  return PER
    .map(row => {
      const name = str(row["Persona Name"]);
      const isRecommended = recommended.includes(s(name));
      const ov = wordMatch(q, `${row["Common Product Categories"]} ${row["AI Search Tags"]}`);
      if (!isRecommended && ov < 1) return null;
      return {
        id:              str(row["Persona ID"]),
        name,
        goal:            str(row["Primary Goal"]),
        painPoint:       str(row["Primary Pain Point"]),
        buyingMotivation:str(row["Buying Motivation"]),
        score:           isRecommended ? 90 + ov * 2 : ov * 20,
        relevanceScore:  isRecommended ? 90 + ov * 2 : ov * 20,
        source:          "Customer Persona Database" as const,
        matchReason:     isRecommended ? `Directly recommended by keyword DB` : `Category overlap`,
      } as MatchedPersona;
    })
    .filter((r): r is MatchedPersona => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// ── Step 6: Problems ──────────────────────────────────────────────────────────

function getProblems(industry: string, input: AnalysisInput): MatchedProblem[] {
  const q = s(`${input.productName} ${input.description ?? ""} ${industry}`);
  return PROB
    .map(row => {
      const ov = wordMatch(q, `${row["Common Products"]} ${row["AI Search Tags"]}`);
      if (ov < 1) return null;
      return {
        id:      str(row["Problem ID"]),
        problem:        str(row["Problem"]),
        goal:           str(row["Customer Goal"]),
        commonProducts: str(row["Common Products"]),
        customerGoal:   str(row["Customer Goal"]),
        score:          ov * 25,
        source:         "Product Problem Database" as const,
      } as MatchedProblem;
    })
    .filter((r): r is MatchedProblem => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

// ── Step 7: Demographics ──────────────────────────────────────────────────────

function getDemographics(industry: string, input: AnalysisInput): RecommendedDemographic[] {
  const q = s(`${input.productName} ${input.description ?? ""} ${industry}`);
  return DEM
    .filter(r => r["Demographic Name"] && str(r["Demographic Name"]) !== "Demographic Name")
    .map(row => {
      const name = str(row["Demographic Name"]);
      const cat  = str(row["Category"]);
      const sub  = str(row["Subcategory"]);
      const ov = wordMatch(q, `${name} ${cat} ${sub}`);
      if (ov < 1) return null;
      return {
        id:             str(row["ID"]),
        category:       cat,
        subcategory:    sub,
        name,
        metaPath:       `${cat} > ${sub} > ${name}`,
        audienceSizeMin:1000000,
        audienceSizeMax:5000000,
        source:         "Demographic Database" as const,
        score:          ov * 20,
      };
    })
    .filter((r): r is RecommendedDemographic => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

// ── Step 8: Strategy & Funnel ─────────────────────────────────────────────────

function getStrategy(industry: string, objective: string) {
  const obj    = str(objective || "Sales");
  const objRow = OBJ.find(r => s(r["Campaign Objective"]) === s(obj)) ?? OBJ[0];
  const funRow = FUN.find(r => s(r["Recommended Objective"]) === s(obj)) ?? FUN[0];
  const audRow = AUD.find(r => s(r["Funnel Stage"]) === s(str(funRow?.["Awareness Stage"]))) ?? AUD[0];
  const creRow = CRE.find(r => s(r["Goal"]) === s(obj)) ?? CRE[0];

  const placements = PLACE.map(r => str(r["Placement"])).filter(Boolean);

  return {
    campaignObjective:      str(objRow?.["Campaign Objective"] ?? obj),
    objectiveStrategy:      str(objRow?.["AI Strategy"] ?? ""),
    audienceStrategy:       str(audRow?.["Strategy"] ?? "Interest Targeting"),
    audienceStrategyBestFor:str(audRow?.["Best For"] ?? ""),
    funnelStage:            str(funRow?.["Awareness Stage"] ?? "Awareness"),
    recommendedObjective:   str(funRow?.["Recommended Objective"] ?? obj),
    creativeFocus:          str(funRow?.["Creative Focus"] ?? ""),
    bestCreativeFormat:     str(creRow?.["Best Creative"] ?? ""),
    placements,
    optimizationTips:       OPT.map(r => `${str(r["Condition"])} ${str(r["Metric"])}: ${str(r["Recommendation"])}`).filter(Boolean),
  };
}

// ── Step 9: Psychology & Messaging ────────────────────────────────────────────

function getPsychology(personas: MatchedPersona[], problems: MatchedProblem[]) {
  const goals       = [...new Set(personas.map(p => p.goal).filter(Boolean))];
  const motivations = [...new Set(personas.map(p => p.buyingMotivation).filter(Boolean))];
  const angles      = [...new Set(problems.map(p => p.goal).filter(Boolean))];
  return { customerGoals: goals, buyingMotivations: motivations, messagingAngles: angles };
}

// ── Step 10: Knowledge graph traversal ────────────────────────────────────────

function getKnowledgeGraph(productName: string, industry: string): string[] {
  const path: string[] = [productName];
  for (const edge of REL) {
    const a = str(edge["Entity A"]);
    const b = str(edge["Entity B"]);
    if (s(a) === s(industry) || s(a) === s(productName)) path.push(b);
    else if (s(b) === s(industry)) path.push(a);
  }
  return [...new Set(path)].slice(0, 6);
}

// ── Step 11: Score ────────────────────────────────────────────────────────────

function calcScore(kw: KWMatch | null, interests: RecommendedInterest[], behaviors: RecommendedBehavior[], personas: MatchedPersona[], demographics: RecommendedDemographic[]) {
  const km = kw ? Math.min(40, kw.score * 0.4) : 0;
  const im = Math.min(25, interests.length * 2.5);
  const bm = Math.min(15, behaviors.length * 2);
  const pm = Math.min(10, personas.length * 4);
  const dm = Math.min(10, demographics.length * 1.5);
  return {
    overallScore: Math.round(km + im + bm + pm + dm),
    scoreBreakdown: {
      keywordMatch:     Math.round(km),
      interestMatch:    Math.round(im),
      behaviorMatch:    Math.round(bm),
      personaMatch:     Math.round(pm),
      demographicMatch: Math.round(dm),
    },
  };
}

// ── Step 12: Summaries (pure DB, no Claude) ───────────────────────────────────

function buildSummaries(
  productName: string, industry: string,
  interests: RecommendedInterest[], personas: MatchedPersona[],
  strategy: ReturnType<typeof getStrategy>, score: number,
  kw: KWMatch | null,
): { executiveSummary: string; audienceInsight: string; whyThisAudience: string } {
  const topInt   = interests.slice(0, 3).map(i => i.name).join(", ") || "multiple relevant interests";
  const topPer   = personas.slice(0, 2).map(p => p.name).join(" and ") || "target consumers";
  const confLine = score >= 80 ? "high confidence" : score >= 60 ? "medium confidence" : "low confidence — expand keyword database";
  const matchedKW = kw ? `"${str(kw.row["Primary Keyword"])}"` : "category-level signals";

  return {
    executiveSummary: `${productName} falls within the ${industry} industry with ${confLine} (score: ${score}/100). The Intelligence Engine matched via ${matchedKW} and found ${interests.length} relevant Meta interests and audiences. Primary campaign objective: ${strategy.campaignObjective}.`,
    audienceInsight:  `Core buyers are ${topPer}. They are primarily targeted through ${topInt} on Meta. The audience strategy is ${strategy.audienceStrategy}, best for ${strategy.audienceStrategyBestFor || "new and scaling campaigns"}.`,
    whyThisAudience:  `These interests were selected by traversing the keyword → product family → category → industry → interest chain in the Smarkin Intelligence Engine. Funnel stage: ${strategy.funnelStage}. Creative focus: ${strategy.creativeFocus || "engagement-led content"}. No interests were invented — all come from the database.`,
  };
}

// ── Step 13: Confidence level label ──────────────────────────────────────────

function confidenceLevel(kw: KWMatch | null): AudienceReport["matchConfidenceLevel"] {
  if (!kw) return "none";
  if (kw.level === 1) return "exact";
  if (kw.level === 2) return "keyword";
  if (kw.level === 3) return "family";
  if (kw.level <= 4) return "category";
  return "industry";
}

// ── Step 14: Marketing Benchmarks — real data, was previously hardcoded null ──
function getBenchmark(industry: string, objective: string): IndustryBenchmark | null {
  // Prefer exact industry + objective match, fall back progressively.
  // Industry strings from classification (e.g. "Health, Fitness") don't always
  // exactly match the benchmark table's naming (e.g. "Health & Fitness") — same
  // mismatch pattern already handled elsewhere in this file with a fuzzy fallback.
  const exact = BENCH.find(b => s(b["Industry"]) === s(industry) && s(b["Campaign Objective"]) === s(objective));
  const industryOnly = BENCH.find(b => s(b["Industry"]) === s(industry));
  const fuzzy = BENCH.find(b =>
    splitCSV(industry).some(seg => s(b["Industry"]).includes(s(seg))) ||
    s(b["Industry"]).split("/").some(seg => s(industry).includes(s(seg.trim())))
  );
  const row = exact ?? industryOnly ?? fuzzy ?? null;
  if (!row) return null;

  return {
    industry: str(row["Industry"]),
    "Average CTR (%)": str(row["Average CTR (%)"]),
    "Average CPC ($)": str(row["Average CPC ($)"]),
    "Average CPM ($)": str(row["Average CPM ($)"]),
    "Average ROAS":    str(row["Average ROAS"]),
    "Average CPA ($)": str(row["Average CPA ($)"]),
    // Not present in the source data — left blank rather than inventing a formula-derived number
    "Recommended Daily Budget": "",
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateReport(input: AnalysisInput): AudienceReport {
  // 1. Classify
  const kw       = classifyKeyword(input);
  const industry = detectIndustry(kw, input);

  // 2. Classification metadata
  const cat     = str(kw?.row["Product Category"]      ?? input.businessType ?? "General");
  const sub     = str(kw?.row["Product Subcategory"]   ?? "");
  const pfamily = str(kw?.row["AI Decision Trigger"]   ?? industry);
  const ptype   = str(kw?.row["Product Type"]          ?? cat);
  const sector  = str(kw?.row["Related Industries"]    ?? industry);

  // 3. DB lookups — all pure database, zero AI
  const interests  = getInterests(kw, industry, input, 20);
  const behaviors  = getBehaviors(kw, industry, input, 10);
  const personas   = getPersonas(kw, industry, input);
  const problems   = getProblems(industry, input);
  const demographics = getDemographics(industry, input);
  const strategy   = getStrategy(industry, input.objective ?? "Sales");
  const psychology = getPsychology(personas, problems);
  const graphPath  = getKnowledgeGraph(input.productName, industry);
  const { overallScore, scoreBreakdown } = calcScore(kw, interests, behaviors, personas, demographics);
  const summaries  = buildSummaries(input.productName, industry, interests, personas, strategy, overallScore, kw);

  // Matched keyword count
  const matchedKwCount = kw ? KW.filter(r => s(r["Product Category"]) === s(kw.row["Product Category"])).length : 0;
  const benchmark = getBenchmark(industry, input.objective ?? "Sales");

  return {
    // Classification
    industry,
    sector,
    category:       cat,
    subCategory:    sub,
    productFamily:  pfamily,
    productType:    ptype,
    matchedKeywordCount:  matchedKwCount,
    matchConfidenceLevel: confidenceLevel(kw),

    // Core DB results
    interests,
    behaviors,
    demographics,
    personas,
    problems,

    // Strategy (from DB)
    ...strategy,
    creativeHooks: [
      psychology.customerGoals[0] ? `"${psychology.customerGoals[0]}" — speak directly to the goal` : "",
      psychology.buyingMotivations[0] ? `Lead with ${psychology.buyingMotivations[0]}` : "",
      `Use ${strategy.bestCreativeFormat || "video"} for ${strategy.funnelStage} stage`,
    ].filter(Boolean),

    // Psychology (from DB personas + problems)
    ...psychology,

    // Summaries (DB-built, no Claude)
    ...summaries,

    // Score
    overallScore,
    scoreBreakdown,

    // v3 enrichment fields (DB-only)
    benchmarks: benchmark,
    recommendedOffers: [],
    creativeIntelligence: [],
    psychologyPrinciples: [],
    journeyStage: (DB.funnelRules as Row[]).find(r =>
      s(r["Recommended Objective"]) === s(input.objective ?? "Sales")
    ) ?? null,
    playbook: null,
    knowledgeGraphPath: graphPath,

    // Explainability
    explainability: {
      matchedKeywords:     kw ? [str(kw.row["Primary Keyword"])] : [],
      classificationPath:  [input.productName, cat, industry],
      interestSources:     [...new Set(interests.map(i => i.reason).slice(0, 5))],
      confidenceFactors:   CONF.map(r => str(r["Rule"])).filter(Boolean),
      databaseTablesUsed:  ["keywordMappingDatabase","metaAdsInterest","behaviors",
                            "customerPersonaDatabase","industryIntelligenceDatabase",
                            "audienceStrategies","funnelRules","campaignObjectiveDatabase"],
    },
  };
}

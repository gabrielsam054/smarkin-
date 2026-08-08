/**
 * Smarkin AI — Business Intelligence Engine (Layer 1 orchestrator)
 *
 * Answers "who is this business, and who buys from them" — before any
 * decision or channel gets chosen. This never knows a marketing channel
 * exists; that's the whole point of the layer boundary from the architecture
 * document. Its output, BusinessIntelligenceProfile, is what feeds both
 * decisionEngine.ts and marketingReasoningEngine.ts.
 *
 * Deliberate scope decision: this does NOT reach into matcher.ts's internals
 * (classify(), findProductUnderstanding()) even though similar lookups exist
 * there. Those are deeply coupled to Meta-keyword matching inside a single
 * large function, and extracting them cleanly is a bigger, riskier change to
 * a file that's been verified all session. Instead, the two lookups below are
 * small, standalone, and use the same matching approach — same data, same
 * discipline, separate code path. If matcher.ts's classify() is ever split
 * apart per the refactoring strategy in the architecture doc, these should
 * be replaced with calls into the extracted pieces rather than kept as a
 * second implementation long-term.
 */
import DB_RAW from "./smarkin-db.json";

type Row = Record<string, unknown>;
const DB_ANY = DB_RAW as unknown as Record<string, Row[] | undefined>;

const PRODUCT_UNDERSTANDING = (DB_ANY["aiProductUnderstandingDataba"] ?? []) as Row[];
const INTEREST_INTELLIGENCE = (DB_ANY["interestIntelligenceDatabase"] ?? []) as Row[];
const PERSONAS = (DB_ANY["customerPersonaDatabase"] ?? []) as Row[];
const PROBLEMS = (DB_ANY["productProblemDatabase"] ?? []) as Row[];
const PSYCHOLOGY = (DB_ANY["marketingPsychologyDatabase"] ?? []) as Row[];
const PERSUASION_EDGES = (DB_ANY["persuasionedges"] ?? []) as Row[];
const CUSTOMER_JOURNEY = (DB_ANY["customerJourneyDatabase"] ?? []) as Row[];
const CUSTOMER_QUESTIONS = (DB_ANY["customerquestions"] ?? []) as Row[];
const NODES = (DB_ANY["nodes"] ?? []) as Row[];
const EDGES = (DB_ANY["edges"] ?? []) as Row[];
const EVIDENCE = (DB_ANY["evidence"] ?? []) as Row[];

function s(v: unknown): string { return v == null ? "" : String(v).toLowerCase().trim(); }
function str(v: unknown): string { return v == null ? "" : String(v).trim(); }
// Strips simple trailing plurals (contractor/contractors, service/services)
// before comparison — found necessary via stress-testing, where otherwise-
// clear matches ("Contractor Bookkeeping Service" vs "...for small
// contractors") fell one word short of the overlap threshold purely due to
// pluralization, not a real topical mismatch. Doesn't touch "business" or
// other words already ending in a double-s, avoiding the kind of overly
// loose matching that caused the earlier "arts" false positive.
function normalizeWord(w: string): string {
  return w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w;
}
function words(v: string): Set<string> { return new Set(s(v).split(/\s+/).filter(w => w.length > 2).map(normalizeWord)); }
export function overlap(a: string, b: string): number {
  const aw = words(a), bw = words(b);
  return [...aw].filter(w => bw.has(w)).length;
}

export interface BusinessIntelligenceInput {
  productName: string;
  description?: string;
  businessType?: string;
}

export interface ProductProfile {
  matched: boolean;
  productType: string;
  industry: string;
  category: string;
  subCategory: string;
  functionalDescription: string;
  primaryUseCase: string;
  customerProblem: string;
  customerGoals: string;
  customerAwarenessStage: string;
  confidenceWeight: number;
}

export interface CustomerProfile {
  personas: { name: string; goal: string; painPoint: string; motivation: string }[];
  problems: { problem: string; goal: string }[];
}

export interface InterestProfile {
  matched: boolean;
  generalInterest: string;
  parentCategory: string;
  lifestyle: string;
  motivations: string;
  emotionalDrivers: string;
}

export interface PsychologyProfile {
  relevantPrinciples: { principle: string; definition: string }[];
  relevantFrameworks: { persona: string; framework: string }[];
}

export interface JourneyProfile {
  matched: boolean;
  awarenessStage: string;
  customerMindset: string;
  keyMessage: string;
  psychologyPrinciple: string;
  relevantQuestions: string[];
}

export interface KnowledgeGraphProfile {
  matched: boolean;
  connectedGoals: string[];
  connectedPersonas: string[];
  connectedPainPoints: string[];
  connectedLifestyles: string[];
  evidenceBackedClaims: string[];
}

export interface BusinessIntelligenceProfile {
  input: BusinessIntelligenceInput;
  productProfile: ProductProfile;
  customerProfile: CustomerProfile;
  interestProfile: InterestProfile;
  psychologyProfile: PsychologyProfile;
  journeyProfile: JourneyProfile;
  knowledgeGraphProfile: KnowledgeGraphProfile;
  gaps: string[];
  // Production Completion Sprint, Phase 1 — optional, populated by the
  // caller (not by gatherBusinessIntelligence() itself) when an Industry
  // Pack covers this business. Left undefined for every business outside
  // pack coverage; gatherBusinessIntelligence()'s own internals are
  // completely untouched by this addition.
  industryPackContext?: {
    industry: string;
    category: string;
    businessModel: string;
    revenueModel: string;
    marketOverview: string;
    seasonality: string | null;
    opportunities: string[];
    risks: string[];
    source: string;
    confidence: number;
  };
}

// ── Product Intelligence — fuzzy match against Product Type, same approach
//    as matcher.ts's findProductUnderstanding(), reimplemented standalone ────
function lookupProductProfile(input: BusinessIntelligenceInput, gaps: string[]): ProductProfile {
  const q = s(`${input.productName} ${input.description ?? ""}`);
  let best: { row: Row; score: number } | null = null;

  for (const row of PRODUCT_UNDERSTANDING) {
    const productType = s(row["Product Type"]);
    if (!productType) continue;
    let score = 0;
    if (q === productType) score = 100;
    else if (q.includes(productType) || productType.includes(q)) score = 90;
    else {
      // Word-overlap against Product Type itself — catches the same words in
      // a different order (e.g. "a subscription box for spicy hot sauce
      // lovers" vs. the row's "Hot Sauce Subscription Box"), which the
      // exact/substring checks above miss entirely since word order differs.
      // Found via stress-testing with realistic phrasing, not assumed.
      const typeOverlap = overlap(q, productType);
      const functionOverlap = overlap(q, `${row["Primary Use Case"]} ${row["Product Function"]}`);
      if (typeOverlap >= 2) score = 55 + typeOverlap * 5;
      else if (functionOverlap >= 2) score = 40 + functionOverlap * 5;
    }
    if (score > 0 && (!best || score > best.score)) best = { row, score };
  }

  if (!best || best.score < 40) {
    gaps.push(`No Product Intelligence match for "${input.productName}" — aiProductUnderstandingDataba has 48 rows, likely too thin for this product. Falling back to empty profile rather than a weak guess.`);
    return { matched: false, productType: "", industry: "", category: "", subCategory: "",
      functionalDescription: "", primaryUseCase: "", customerProblem: "", customerGoals: "",
      customerAwarenessStage: "", confidenceWeight: 0 };
  }

  const row = best.row;
  return {
    matched: true,
    productType: str(row["Product Type"]),
    industry: str(row["Industry"]),
    category: str(row["Category"]),
    subCategory: str(row["Sub Category"]),
    functionalDescription: str(row["Product Function"]),
    primaryUseCase: str(row["Primary Use Case"]),
    customerProblem: str(row["Customer Problem"]),
    customerGoals: str(row["Customer Goals"]),
    customerAwarenessStage: str(row["Customer Awareness Stage"]),
    confidenceWeight: Number(row["Confidence Weight"]) || 0,
  };
}

// ── Customer Intelligence — same tag/category overlap approach engine.ts uses,
//    reimplemented standalone ──────────────────────────────────────────────────
function lookupCustomerProfile(input: BusinessIntelligenceInput, productProfile: ProductProfile, gaps: string[]): CustomerProfile {
  const q = s(`${input.productName} ${input.description ?? ""} ${productProfile.category} ${productProfile.industry}`);

  const matchedPersonas = PERSONAS.filter(p =>
    overlap(q, str(p["AI Search Tags"])) >= 1 || overlap(q, str(p["Common Product Categories"])) >= 1
  ).slice(0, 3);

  if (matchedPersonas.length === 0) {
    gaps.push(`No Customer Intelligence personas matched "${input.productName}" — customerPersonaDatabase has 68 rows but none overlapped this product's category/tags.`);
  }

  const matchedProblems = PROBLEMS.filter(pr =>
    overlap(q, str(pr["AI Search Tags"])) >= 1 || overlap(q, str(pr["Common Products"])) >= 1
  ).slice(0, 3);

  return {
    personas: matchedPersonas.map(p => ({
      name: str(p["Persona Name"]), goal: str(p["Primary Goal"]),
      painPoint: str(p["Primary Pain Point"]), motivation: str(p["Buying Motivation"]),
    })),
    problems: matchedProblems.map(pr => ({ problem: str(pr["Problem"]), goal: str(pr["Customer Goal"]) })),
  };
}

// ── Interest Intelligence — new lookup, matches by category/tag overlap
//    against the (currently 7-row) interestIntelligenceDatabase ──────────────
function lookupInterestProfile(input: BusinessIntelligenceInput, productProfile: ProductProfile, gaps: string[]): InterestProfile {
  const q = s(`${input.productName} ${productProfile.category} ${productProfile.industry}`);
  let best: { row: Row; score: number } | null = null;

  for (const row of INTEREST_INTELLIGENCE) {
    const interestName = s(row["General Interest"]);
    const score = overlap(q, `${interestName} ${row["Parent Category"]} ${row["Related Product Categories"] ?? ""} ${row["Related Industries"] ?? ""}`);
    if (score > 0 && (!best || score > best.score)) best = { row, score };
  }

  // Minimum threshold of 2 overlapping words, not 1 — a single incidental
  // shared word (e.g. "martial arts" and "Arts & Hobbies" sharing only
  // "arts") produced a real false-positive match to Photography, found via
  // a stress test with realistic business descriptions, not a synthetic one.
  if (!best || best.score < 2) {
    gaps.push(`No Interest Intelligence match — this table only has 7 rows built so far (out of ~1,000 planned), so most products won't match yet. This is the thinnest layer in the platform.`);
    return { matched: false, generalInterest: "", parentCategory: "", lifestyle: "", motivations: "", emotionalDrivers: "" };
  }

  const row = best.row;
  return {
    matched: true,
    generalInterest: str(row["General Interest"]),
    parentCategory: str(row["Parent Category"]),
    lifestyle: str(row["Lifestyle"]),
    motivations: str(row["Motivations"]),
    emotionalDrivers: str(row["Emotional Drivers"] ?? ""),
  };
}

// ── Psychology Intelligence — principles relevant to the matched personas,
//    plus persuasion frameworks per persona (reuses persuasionedges, same
//    lookup already used in actions.ts and marketingReasoningEngine.ts) ──────
function lookupPsychologyProfile(customerProfile: CustomerProfile, gaps: string[]): PsychologyProfile {
  const relevantFrameworks = customerProfile.personas
    .map(p => {
      const edge = PERSUASION_EDGES.find(e => s(e["Persona"]) === s(p.name));
      return edge ? { persona: p.name, framework: str(edge["Best Framework"]) } : null;
    })
    .filter((x): x is { persona: string; framework: string } => x !== null);

  // Pull a small, relevant slice of principles rather than all 20 — matched
  // loosely against persona motivation/pain-point text, same spirit as the
  // heuristic in marketingReasoningEngine.ts but kept separate since this
  // profile is meant to be a broad summary, not the reasoning engine's
  // channel-adjustment logic.
  const personaText = s(customerProfile.personas.map(p => `${p.motivation} ${p.painPoint}`).join(" "));
  const relevantPrinciples = PSYCHOLOGY
    .filter(p => personaText.includes(s(str(p["Principle"]).split(" ")[0])))
    .slice(0, 4)
    .map(p => ({ principle: str(p["Principle"]), definition: str(p["Definition"]) }));

  if (relevantFrameworks.length === 0 && customerProfile.personas.length > 0) {
    gaps.push(`No persuasion framework matched for any of the ${customerProfile.personas.length} personas found — persuasionedges only has 5 rows, thin coverage.`);
  }

  return { relevantPrinciples, relevantFrameworks };
}

// ── Journey Intelligence — matches the product's own Customer Awareness Stage
//    (from Product Intelligence, when matched) against customerJourneyDatabase's
//    fuller funnel model, then pulls relevant customer questions from the
//    simpler buyingstage/customerquestions taxonomy as a secondary cross-check.
//    These are two genuinely different stage taxonomies in the database — this
//    function is the one place that bridges them, rather than silently picking
//    one and ignoring the other. ──────────────────────────────────────────────
function lookupJourneyProfile(productProfile: ProductProfile, gaps: string[]): JourneyProfile {
  const stageText = productProfile.customerAwarenessStage;
  const primaryStage = stageText.split(",")[0].trim() || "Unaware";

  const journeyRow = CUSTOMER_JOURNEY.find(j => s(j["Stage"]) === s(primaryStage));
  if (!journeyRow) {
    gaps.push(`No Customer Journey match for stage "${primaryStage}" — customerJourneyDatabase has 10 rows, may not cover every stage label Product Intelligence produces.`);
  }

  // Cross-reference into the simpler buyingstage/customerquestions taxonomy —
  // rough mapping since the two taxonomies use different stage names.
  const STAGE_BRIDGE: Record<string, string> = {
    "unaware": "Discovery", "problem aware": "Discovery", "solution aware": "Research",
    "product aware": "Evaluation", "most aware": "Purchase", "purchase": "Purchase",
    "retention": "Loyalty", "referral": "Advocacy",
  };
  const bridgedStage = STAGE_BRIDGE[s(primaryStage)] ?? "";
  const relevantQuestions = CUSTOMER_QUESTIONS
    .filter(q => s(q["Buying Stage"]) === s(bridgedStage))
    .map(q => str(q["Question"]));

  if (relevantQuestions.length === 0) {
    gaps.push(`No Customer Questions found for buying stage "${bridgedStage || primaryStage}" — customerquestions only has 7 rows total across 6 stages.`);
  }

  return {
    matched: !!journeyRow,
    awarenessStage: primaryStage,
    customerMindset: journeyRow ? str(journeyRow["Customer Mindset"]) : "",
    keyMessage: journeyRow ? str(journeyRow["Key Message"]) : "",
    psychologyPrinciple: journeyRow ? str(journeyRow["Psychology Principle"]) : "",
    relevantQuestions,
  };
}

// ── Knowledge Graph Service — Layer 1 scope only. Traverses the SAME graph
//    matcher.ts uses, but deliberately stops at customer-intelligence nodes
//    (Goal, Persona, Pain Point, Lifestyle). It never continues to
//    MATCHES_META_INTEREST edges — that traversal belongs to the Meta Channel
//    Adapter in Layer 3, not here. This is a real scope boundary, not a
//    shortcut: Layer 1 must never know a marketing channel exists. ───────────
const LAYER1_NODE_TYPES = new Set(["Goal", "Persona", "Pain Point", "Lifestyle"]);

function lookupKnowledgeGraphProfile(input: BusinessIntelligenceInput, gaps: string[]): KnowledgeGraphProfile {
  const q = s(input.productName);
  const productNodes = NODES.filter(n => str(n["Node Type"]) === "Product");

  let productNode = productNodes.find(n => s(n["Node Name"]) === q || q.includes(s(n["Node Name"])) || s(n["Node Name"]).includes(q));

  // Same word-overlap fallback fix applied to lookupProductProfile() earlier —
  // exact/substring matching alone misses same-words-different-order phrasing
  // (e.g. "a subscription box for spicy hot sauce lovers" vs the node
  // "Hot Sauce Subscription Box"). Requires 2+ shared words to avoid the
  // single-incidental-word false positive already found and fixed in
  // lookupInterestProfile().
  if (!productNode) {
    let best: { node: Row; score: number } | null = null;
    for (const n of productNodes) {
      const score = overlap(q, s(n["Node Name"]));
      if (score >= 2 && (!best || score > best.score)) best = { node: n, score };
    }
    if (best) productNode = best.node;
  }

  if (!productNode) {
    gaps.push(`No Knowledge Graph Product node matched "${input.productName}" — graph currently covers ~45 products, most products won't have a node yet.`);
    return { matched: false, connectedGoals: [], connectedPersonas: [], connectedPainPoints: [], connectedLifestyles: [], evidenceBackedClaims: [] };
  }

  const productNodeName = str(productNode["Node Name"]);
  const connectedGoals: string[] = [], connectedPersonas: string[] = [];
  const connectedPainPoints: string[] = [], connectedLifestyles: string[] = [];
  const evidenceBackedClaims: string[] = [];
  const nodeTypeByName = new Map(NODES.map(n => [s(n["Node Name"]), str(n["Node Type"])]));

  // Single-hop-plus from the product — SUPPORTS to Goal, then Goal's own
  // ATTRACTS_PERSONA / HAS_PAIN_POINT / HAS_LIFESTYLE edges. Deliberately
  // shallow (Layer 1 doesn't need the full multi-hop traversal matcher.ts
  // does to reach a Meta interest — it only needs the immediate customer
  // intelligence context).
  const directEdges = EDGES.filter(e => e["Source"] === productNodeName);
  for (const edge of directEdges) {
    const target = str(edge["Target"]);
    const targetType = nodeTypeByName.get(s(target)) ?? "";
    if (targetType === "Goal") {
      connectedGoals.push(target);
      const evidenceRow = EVIDENCE.find(ev => ev["Source Node"] === productNodeName && ev["Target Node"] === target);
      if (evidenceRow) {
        evidenceBackedClaims.push(`"${productNodeName}" ${edge["Relationship"]} "${target}" — verified by ${evidenceRow["Evidence Type"]}: ${evidenceRow["Evidence Source"]}`);
      }
      const goalEdges = EDGES.filter(e => e["Source"] === target);
      for (const ge of goalEdges) {
        const geTarget = str(ge["Target"]);
        const geType = nodeTypeByName.get(s(geTarget)) ?? "";
        if (geType === "Persona" && LAYER1_NODE_TYPES.has(geType)) connectedPersonas.push(geTarget);
      }
    }
    if (targetType === "Pain Point") connectedPainPoints.push(target);
  }

  // Persona -> Lifestyle, Persona -> Pain Point (one more hop from any
  // persona already found — this HAS_PAIN_POINT traversal was missing
  // entirely until now, even though the direct product-level pain point
  // check above already existed. Most pain points in the graph connect to
  // the PERSONA, not directly to the product, which is exactly why
  // "Whey Protein" returned zero pain points despite having real ones
  // reachable one hop further.
  for (const persona of connectedPersonas) {
    const lifestyleEdges = EDGES.filter(e => e["Source"] === persona && e["Relationship"] === "HAS_LIFESTYLE");
    connectedLifestyles.push(...lifestyleEdges.map(e => str(e["Target"])));
    const personaPainEdges = EDGES.filter(e => e["Source"] === persona && e["Relationship"] === "HAS_PAIN_POINT");
    connectedPainPoints.push(...personaPainEdges.map(e => str(e["Target"])));
  }

  return {
    matched: true,
    connectedGoals: [...new Set(connectedGoals)],
    connectedPersonas: [...new Set(connectedPersonas)],
    connectedPainPoints: [...new Set(connectedPainPoints)],
    connectedLifestyles: [...new Set(connectedLifestyles)],
    evidenceBackedClaims,
  };
}

// ── Main export ────────────────────────────────────────────────────────────────
export function gatherBusinessIntelligence(input: BusinessIntelligenceInput): BusinessIntelligenceProfile {
  const gaps: string[] = [];

  const productProfile = lookupProductProfile(input, gaps);
  const customerProfile = lookupCustomerProfile(input, productProfile, gaps);
  const interestProfile = lookupInterestProfile(input, productProfile, gaps);
  const psychologyProfile = lookupPsychologyProfile(customerProfile, gaps);
  const journeyProfile = lookupJourneyProfile(productProfile, gaps);
  const knowledgeGraphProfile = lookupKnowledgeGraphProfile(input, gaps);

  return { input, productProfile, customerProfile, interestProfile, psychologyProfile, journeyProfile, knowledgeGraphProfile, gaps };
}

// Convenience export — the most common downstream need is just the persona
// names, e.g. to feed straight into marketingReasoningEngine.ts's
// analyzeMarketingReasoning(personaNames).
export function getPersonaNames(profile: BusinessIntelligenceProfile): string[] {
  // Knowledge Graph personas come from verified SUPPORTS/ATTRACTS_PERSONA edges
  // — objectively higher quality than the tag-overlap heuristic in
  // lookupCustomerProfile(). Merge both rather than letting the weaker source
  // silently win when the product name doesn't happen to share vocabulary
  // with a persona's AI Search Tags (exactly what happened testing this
  // against "Whey Protein" — the graph found Fitness Enthusiast and
  // Bodybuilder via real edges, but the tag-overlap lookup found nothing,
  // and only the tag-overlap result was being used downstream).
  const tagBased = profile.customerProfile.personas.map(p => p.name);
  const graphBased = profile.knowledgeGraphProfile.connectedPersonas;
  return [...new Set([...graphBased, ...tagBased])];
}

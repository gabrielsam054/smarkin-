"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { generateReport } from "@/lib/engine";
import { getGuardForCurrentUser } from "@/lib/subscription-guard";
import { callClaude } from "@/lib/claude";
import { runHierarchicalMatcher } from "@/lib/matcher";
import DB_RAW from "@/lib/smarkin-db.json";

// ─────────────────────────────────────────────────────────────────────────────
// ARCHITECTURE:
//
//   1. runHierarchicalMatcher()  →  finalInterests, finalBehaviors  (DB authority)
//   2. generateReport()          →  personas, benchmarks, playbook   (DB authority)
//   3. enrichWithClaude()        →  narrative only, no interest picking
//
// Claude NEVER sees a list of interests to choose from.
// Claude ONLY sees the already-finalised interests to explain.
// ─────────────────────────────────────────────────────────────────────────────

interface FinalInterest {
  name: string;
  mainCategory: string;
  subCategory: string;
  buyingIntent: string;
  score: number;
  matchSource?: string;
  relationshipPath?: string[];
  tier?: string;
  // Full explainability — carried through from the Relationship Expansion Engine
  relationshipType?: string;
  relationshipWeight?: number;
  relationshipDistance?: number;
  sourceQuality?: number;
  businessRelevance?: number;
  personaMatch?: number;
  industryMatch?: number;
  purchaseIntentScore?: number;
  confidence?: string;
  confidenceScore?: number;
  reason?: string;
  databaseTable?: string;
}

interface FinalBehavior {
  id: string;
  category: string;
  parent: string;
  child: string;
  metaAudience: string;
  matchSource?: string;
  // intelligence.ts reads these directly (unguarded) — must always be present
  reason: string;
  verification: string;
}

// ── DB tables for the Decision Engine's Reason/Evidence/Decision Rule sections ─
// Same pattern as engine.ts / matcher.ts — read once at module load.
type Row = Record<string, unknown>;
const DB_ANY = DB_RAW as unknown as Record<string, Row[] | undefined>;
const DECISION_RULES   = (DB_ANY["decisionRule"]              ?? []) as Row[];
const CONFIDENCE_RULES = (DB_ANY["aiConfidenceRule"]           ?? []) as Row[];
const PSYCHOLOGY       = (DB_ANY["marketingPsychologyDatabase"] ?? []) as Row[];
const OFFERS           = (DB_ANY["offerIntelligenceDatabase"]   ?? []) as Row[];
// Previously completely unread by any code path — wiring these in now.
const CUSTOMER_JOURNEY  = (DB_ANY["customerJourneyDatabase"]     ?? []) as Row[];
const CAMPAIGN_PLAYBOOK = (DB_ANY["campaignPlaybookDatabase"]    ?? []) as Row[];
// Previously unused — wiring in this round.
const CREATIVE_INTEL    = (DB_ANY["creativeIntelligenceDatabase"] ?? []) as Row[];
const PRODUCT_INTEL     = (DB_ANY["productIntelligenceDatabase"]  ?? []) as Row[];
const COPY_ANGLES       = (DB_ANY["copyangles"]                   ?? []) as Row[];
const CREATIVE_STYLES   = (DB_ANY["creativestyles"]                ?? []) as Row[];
const PERSUASION_FRAMEWORKS = (DB_ANY["persuasionframeworks"]      ?? []) as Row[];
const PERSUASION_EDGES  = (DB_ANY["persuasionedges"]                ?? []) as Row[];
const BUYING_BARRIERS   = (DB_ANY["buyingbarriers"]                 ?? []) as Row[];
const BUYING_SOLUTIONS  = (DB_ANY["buyingsolutions"]                ?? []) as Row[];
const BUYING_STAGE      = (DB_ANY["buyingstage"]                    ?? []) as Row[];
const CUSTOMER_QUESTIONS= (DB_ANY["customerquestions"]              ?? []) as Row[];
const COUNTRIES         = (DB_ANY["countries"]                      ?? []) as Row[];
const CURRENCIES        = (DB_ANY["currencies"]                     ?? []) as Row[];

function s(v: unknown): string { return v == null ? "" : String(v).toLowerCase().trim(); }
function str(v: unknown): string { return v == null ? "" : String(v).trim(); }

// ── Claude: AI Reasoning Engine for Smarkin ──────────────────────────────────
// Implements the Smarkin Decision Engine (STEP 1-7). The database has already
// completed retrieval and selection before this function runs — Claude's job
// is STEP 7 only ("Explain every recommendation"), using the Decision Engine's
// required OUTPUT FORMAT. Claude never selects interests, personas, or Decision
// Rules — it narrates the ones the database already selected.
async function enrichWithClaude(
  productName: string,
  description: string,
  objective: string,
  country: string,
  report: ReturnType<typeof generateReport>,
  // These are FINAL — already selected by the DB matcher, not candidates
  finalInterests: FinalInterest[],
  finalBehaviors: FinalBehavior[],
  matchLevel: string,
  matcherConfidence: number,
  relationshipGaps: string[],
) {
  const system = `You are the AI Reasoning Engine for Smarkin.

Your job is NOT to invent marketing advice. Your job is to reason using the
Smarkin Intelligence Database. The database is the single source of truth.

Never hallucinate products, Meta interests, audiences, personas, relationships,
campaign strategies, hooks, or offers. If information is missing from the
database, state that it is unavailable rather than inventing an answer.

You must think like a senior Meta Ads strategist that follows evidence. For
every recommendation you must provide an explanation showing WHY it was
selected. Always prioritize verified database relationships over language
model assumptions.

IMPORTANT CONTEXT — READ BEFORE REASONING:
The Smarkin Intelligence Engine has ALREADY completed Steps 1-6 of the Decision
Engine before you were called:
- STEP 1 (Product Profile), STEP 2 (Customer Intelligence), and STEP 3
  (Knowledge Graph traversal) were completed by the hierarchical matcher —
  the interests, behaviors, and personas below are the verified OUTPUT of
  that traversal, not candidates for you to select from.
- STEP 4 (Decision Rules) and STEP 5 (Audience Ranking) were applied
  automatically — the DECISION RULES and CONFIDENCE RULES sections below show
  you which ones fired.
- STEP 6 (Marketing Scenario) inputs — objective, benchmarks, offers,
  psychology principles — are provided below as verified facts.

YOUR JOB IS STEP 7 ONLY: Explain every recommendation using the required
OUTPUT FORMAT. You did not select the interests, personas, or Decision Rules
below. You cannot change them. You cannot add new ones. You explain them.

CRITICAL RULES:
- Never invent Meta interests.
- Never invent relationships.
- Never create personas not found in the database.
- Never recommend campaigns that contradict the Decision Rules listed below.
- Always explain every recommendation with Reason, Evidence, and Relationship Path.
- The database decides. The language model explains.
- Return ONLY valid JSON with no text outside the JSON object.
- Never output a "recommendedInterests", "recommendedBehaviors", or "personas" key —
  those already exist in the database output; you only narrate them.`;

  // ── Build fact blocks — all sourced from DB, none invented ──────────────────
  const interestFacts = finalInterests.slice(0, 20).map((i, idx) =>
    `${idx + 1}. "${i.name}" | Category: ${i.mainCategory} → ${i.subCategory} | Buying Intent: ${i.buyingIntent} | Relationship: ${i.relationshipType ?? "?"} (distance ${i.relationshipDistance ?? "?"}, confidence ${i.confidenceScore ?? "?"}) | Tier: ${i.tier ?? "primary"} | Path: ${(i.relationshipPath ?? []).join(" → ")} | Reason: ${i.reason ?? i.matchSource ?? "DB match"}`
  ).join("\n");

  const behaviorFacts = finalBehaviors.slice(0, 10).map((b, idx) =>
    `${idx + 1}. "${b.metaAudience || b.parent} > ${b.child}" | Category: ${b.category} | Source: ${b.matchSource ?? "DB match"}`
  ).join("\n");

  const personaFacts = (report.personas ?? []).slice(0, 3).map((p, i) =>
    `${i + 1}. ${p.name} — Goal: ${p.goal ?? ""} | Pain: ${(p as unknown as Record<string,unknown>).painPoint ?? ""} | Motivation: ${p.buyingMotivation ?? ""}`
  ).join("\n");

  const gapsFacts = relationshipGaps.length > 0
    ? relationshipGaps.map((g, i) => `${i + 1}. ${g}`).join("\n")
    : "No layer gaps detected — every relationship layer contributed at least one candidate.";

  // Decision Rules — match against product/industry text, only include rules that plausibly fired
  const q = s(`${productName} ${description} ${report.industry} ${report.category}`);
  const matchedDecisionRules = DECISION_RULES.filter(r =>
    s(r["Condition"]).split(" ").some(w => w.length > 3 && q.includes(w))
  ).slice(0, 5);
  const decisionRuleFacts = matchedDecisionRules.length > 0
    ? matchedDecisionRules.map((r, i) =>
        `${i + 1}. [${r["Rule ID"]}] IF ${r["Condition"]} THEN ${r["Action"]} (weight ${r["Weight"]}, priority ${r["Priority"]})`
      ).join("\n")
    : "No Decision Rules matched this product's condition text — flag this as a database gap, do not invent a rule.";

  // Confidence Rules — always include all 6, since these define how to talk about confidence generally
  const confidenceRuleFacts = CONFIDENCE_RULES.map((r, i) =>
    `${i + 1}. Level ${r["Confidence Level"]}: ${r["Rule"]} → ${r["AI Action"]}`
  ).join("\n");

  // Marketing Psychology — pick principles matching the funnel stage
  const stage = s(report.funnelStage || "awareness");
  const matchedPsychology = PSYCHOLOGY.filter(p =>
    s(p["Best Funnel Stage"]).includes(stage) || stage.includes(s(str(p["Best Funnel Stage"]).split("/")[0]))
  ).slice(0, 3);
  const psychologyFacts = (matchedPsychology.length > 0 ? matchedPsychology : PSYCHOLOGY.slice(0, 3))
    .map((p, i) => `${i + 1}. ${p["Principle"]}: ${p["Definition"]} | Best for: ${p["Best Funnel Stage"]} | Example CTA: ${p["Best CTA Examples"]}`)
    .join("\n");

  // Offers — match by industry
  const matchedOffers = OFFERS.filter(o => s(o["Industry"]).includes(s(report.industry).split(",")[0].trim()) || s(report.industry).includes(s(o["Industry"]).split("/")[0].trim()))
    .slice(0, 3);
  const offerFacts = (matchedOffers.length > 0 ? matchedOffers : OFFERS.slice(0, 3))
    .map((o, i) => `${i + 1}. ${o["Offer Name"]} (${o["Offer Type"]}) | Best for: ${o["Funnel Stage"]}, ${o["Buying Intent"]} intent | Example CTA: ${o["Example CTA"]}`)
    .join("\n");

  // Customer Journey — prefer an industry-specific variant, fall back to the generic canonical stage
  const journeyRow =
    CUSTOMER_JOURNEY.find(j => s(j["Stage"]) === s(report.funnelStage) &&
                               str(j["Industry Variant"] ?? "") &&
                               (s(report.industry).includes(s(str(j["Industry Variant"]))) || s(str(j["Industry Variant"])).includes(s(report.industry).split(",")[0].trim())))
    ?? CUSTOMER_JOURNEY.find(j => s(j["Stage"]) === s(report.funnelStage))
    ?? null;
  const journeyFacts = journeyRow
    ? `Stage: ${journeyRow["Stage"]} | Customer Mindset: ${journeyRow["Customer Mindset"]} | Key Message: ${journeyRow["Key Message"]} | Recommended Creative: ${journeyRow["Recommended Creative"]} | Recommended CTA: ${journeyRow["Recommended CTA"]} | Psychology Principle: ${journeyRow["Psychology Principle"]}`
    : `No exact journey stage match for "${report.funnelStage}" — flag as a database gap, do not invent a stage.`;

  // Campaign Playbook — match by industry, fall back to closest available
  const matchedPlaybook = CAMPAIGN_PLAYBOOK.find(p => s(p["Industry"]).includes(s(report.industry).split(",")[0].trim()) || s(report.industry).includes(s(p["Industry"]).split("/")[0].trim()))
    ?? null;
  const playbookFacts = matchedPlaybook
    ? `Industry: ${matchedPlaybook["Industry"]} | Funnel: ${matchedPlaybook["Recommended Funnel"]} | Budget Allocation: ${matchedPlaybook["Budget Allocation"]} | Primary Offer: ${matchedPlaybook["Primary Offer"]} | Key KPIs: ${matchedPlaybook["Key KPIs"]} | Optimization Tips: ${matchedPlaybook["Optimization Tips"]}`
    : `No Campaign Playbook matched industry "${report.industry}" — flag as a database gap, do not invent a playbook.`;

  // Creative Intelligence — match by industry + funnel stage
  const matchedCreative = CREATIVE_INTEL.find(c =>
    s(c["Best Industry"]).includes(s(report.industry).split(",")[0].trim()) &&
    s(c["Recommended Funnel Stage"]).includes(s(report.funnelStage).split("/")[0])
  ) ?? CREATIVE_INTEL.find(c => s(c["Best Industry"]).includes(s(report.industry).split(",")[0].trim())) ?? null;
  const creativeFacts = matchedCreative
    ? `Format: ${matchedCreative["Creative Format"]} | Hook Type: ${matchedCreative["Hook Type"]} | Visual Style: ${matchedCreative["Visual Style"]} | Story Framework: ${matchedCreative["Story Framework"]} | Avg CTR Lift: ${matchedCreative["Average CTR Lift"]}`
    : `No Creative Intelligence match for this industry/funnel stage — flag as a database gap.`;

  // Product Intelligence — exact/fuzzy match by product name, feeds cross-sell/upsell
  const matchedProductIntel = PRODUCT_INTEL.find(p => s(p["Product Name"]) === s(productName))
    ?? PRODUCT_INTEL.find(p => s(productName).includes(s(p["Product Name"])) || s(p["Product Name"]).includes(s(productName)))
    ?? null;
  const productIntelFacts = matchedProductIntel
    ? `Complementary Products: ${matchedProductIntel["Complementary Products"]} | Upsell: ${matchedProductIntel["Upsell Products"]} | Cross-Sell: ${matchedProductIntel["Cross Sell Products"]} | Buying Cycle: ${matchedProductIntel["Buying Cycle"]} | Price Range: ${matchedProductIntel["Price Range"]}`
    : `No Product Intelligence entry matches "${productName}" exactly — flag as a database gap, do not invent cross-sell/upsell products.`;

  // Copy Angles + Creative Styles — small reference lists, include all
  const copyAngleFacts = COPY_ANGLES.map((c, i) => `${i + 1}. ${c["Angle"]} (${c["Emotion"]})`).join(", ");
  const matchedCreativeStyle = CREATIVE_STYLES.find(c => s(c["Best For"]).includes(s(report.category).split(" ")[0]) || s(report.industry).includes(s(c["Best For"])));
  const creativeStyleFacts = matchedCreativeStyle
    ? `${matchedCreativeStyle["Style"]} (best for ${matchedCreativeStyle["Best For"]})`
    : CREATIVE_STYLES.slice(0, 3).map(c => c["Style"]).join(", ");

  // Persuasion Framework — match ALL personas (not just top), fall back gracefully per-persona
  const topPersonaName = (report.personas ?? [])[0]?.name ?? "";
  const matchedPersuasion = PERSUASION_EDGES.find(p => s(p["Persona"]) === s(topPersonaName) || s(topPersonaName).includes(s(p["Persona"])));
  const frameworkName = matchedPersuasion ? str(matchedPersuasion["Best Framework"]) : "";
  const frameworkDef = PERSUASION_FRAMEWORKS.find(f => s(f["Framework"]) === s(frameworkName));
  const persuasionFacts = matchedPersuasion && frameworkDef
    ? `${frameworkName} (${frameworkDef["Purpose"]}) — matched to persona "${matchedPersuasion["Persona"]}", weight ${matchedPersuasion["Weight"]}`
    : `No persuasion framework matched to persona "${topPersonaName}" — flag as a database gap.`;

  // ── Creative Concept Grid — the actual combinatorics behind the Creative
  // Concept Library. Meta's algorithm now reads ad creative itself as the
  // primary targeting signal, and needs 8-15 genuinely distinct concepts per
  // ad set to explore effectively (not 8-15 variations on one idea). Building
  // this as real persona × psychology-principle pairs, not asking Claude to
  // invent variety, is what keeps every concept grounded in verified data.
  const personasForConcepts = (report.personas ?? []).slice(0, 3);
  const conceptGrid: string[] = [];
  let conceptNum = 1;
  for (const persona of personasForConcepts) {
    const personaPersuasion = PERSUASION_EDGES.find(p => s(p["Persona"]) === s(persona.name) || s(persona.name).includes(s(p["Persona"])));
    const personaFramework = personaPersuasion ? str(personaPersuasion["Best Framework"]) : "";
    // Pair this persona with 2-3 distinct psychology principles for real angle variety
    const principlesForPersona = PSYCHOLOGY.filter(p =>
      s(p["Best Funnel Stage"]).includes(s(report.funnelStage).split("/")[0]) ||
      s(p["Best Industries"]).includes(s(report.industry).split(",")[0].trim())
    ).slice(0, 3);
    const fallbackPrinciples = principlesForPersona.length > 0 ? principlesForPersona : PSYCHOLOGY.slice(0, 3);
    for (const principle of fallbackPrinciples) {
      const painPoint = (persona as unknown as Record<string,unknown>).painPoint ?? "";
      conceptGrid.push(
        `${conceptNum}. Persona: "${persona.name}" | Pain point (use this EXACT language in the headline, not a paraphrase): "${painPoint}" | ` +
        `Goal: "${persona.goal}" | Psychology Principle: ${principle["Principle"]} (${principle["Definition"]}) | ` +
        `Framework: ${personaFramework || "none matched"} | Example CTA style: ${principle["Best CTA Examples"]}`
      );
      conceptNum++;
    }
  }
  const conceptGridFacts = conceptGrid.length > 0
    ? conceptGrid.join("\n")
    : "No personas available to build creative concepts — flag as a database gap.";

  // Buying Barriers + Solutions — small reference table, include all as a joined lookup
  const barrierSolutionFacts = BUYING_BARRIERS.map(b => {
    const sol = BUYING_SOLUTIONS.find(s2 => s(s2["Barrier"]) === s(b["Node Name"]));
    return `${b["Node Name"]} → ${sol ? sol["Best Solution"] : "no solution mapped"}`;
  }).join(" | ");

  // Buying Stage + Customer Questions — match stage to funnel stage, pull relevant questions
  const matchedBuyingStage = BUYING_STAGE.find(b => s(report.funnelStage).includes(s(b["Stage"])) || s(b["Stage"]).includes(s(report.funnelStage).split("/")[0]))
    ?? BUYING_STAGE[0];
  const relevantQuestions = CUSTOMER_QUESTIONS.filter(q => s(q["Buying Stage"]) === s(matchedBuyingStage?.["Stage"]));
  const questionFacts = relevantQuestions.length > 0
    ? relevantQuestions.map(q => `"${q["Question"]}"`).join(", ")
    : CUSTOMER_QUESTIONS.slice(0, 2).map(q => `"${q["Question"]}"`).join(", ");

  // Country / Currency — genuine use of input.country, not fabricated
  const countryRow = COUNTRIES.find(c => s(c["Country"]) === s(country));
  const currencyRow = countryRow ? CURRENCIES.find(cur => s(cur["Code"]) === s(countryRow["Currency"])) : null;
  const localizationFacts = countryRow
    ? `Region: ${countryRow["Region"]} | Currency: ${currencyRow ? `${currencyRow["Currency"]} (${currencyRow["Symbol"]})` : countryRow["Currency"]}`
    : `Country "${country}" not in the localization database — use generic USD/global framing.`;

  const prompt = `=== SMARKIN INTELLIGENCE DATABASE — VERIFIED OUTPUT (Steps 1-6 already complete) ===

PRODUCT: ${productName}
DESCRIPTION: ${description || "Not provided"}
OBJECTIVE: ${objective}
COUNTRY: ${country}

--- STEP 1 OUTPUT: PRODUCT PROFILE ---
Industry: ${report.industry}
Sector: ${report.sector}
Category: ${report.category}
Subcategory: ${report.subCategory || "N/A"}
Match Level: ${matchLevel}
Confidence Score: ${matcherConfidence}/100

--- STEP 2 OUTPUT: CUSTOMER INTELLIGENCE ---
Personas (retrieved by engine):
${personaFacts || "No personas retrieved — flag as database gap"}

Customer Goals: ${(report.customerGoals ?? []).slice(0, 4).join(" | ") || "N/A"}
Buying Motivations: ${(report.buyingMotivations ?? []).slice(0, 4).join(" | ") || "N/A"}
Funnel/Awareness Stage: ${report.funnelStage || "Awareness"}
Audience Strategy: ${report.audienceStrategy || "N/A"}

--- STEP 3 OUTPUT: KNOWLEDGE GRAPH TRAVERSAL RESULTS ---
Verified Meta Interests (${finalInterests.length} total, with relationship path and confidence):
${interestFacts || "No interests retrieved — low confidence match, flag as database gap"}

Verified Behaviors (${finalBehaviors.length} total):
${behaviorFacts || "No behaviors retrieved"}

Relationship layers that found ZERO candidates (real gaps — use verbatim, do not invent others):
${gapsFacts}

--- STEP 4 OUTPUT: DECISION RULES APPLIED ---
${decisionRuleFacts}

--- CONFIDENCE RULES (reference for how to describe confidence) ---
${confidenceRuleFacts}

--- STEP 6 INPUTS: MARKETING SCENARIO BUILDING BLOCKS ---
Campaign Objective: ${report.campaignObjective || "Awareness"}
Best Creative Format: ${report.bestCreativeFormat || "N/A"}
Benchmark CTR: ${(report.benchmarks as unknown as Record<string,unknown>)?.["Average CTR (%)"] ?? "N/A"}%
Benchmark CPC: $${(report.benchmarks as unknown as Record<string,unknown>)?.["Average CPC ($)"] ?? "N/A"}

Relevant Marketing Psychology Principles (from database):
${psychologyFacts}

Relevant Offer Types (from database):
${offerFacts}

Customer Journey Stage Detail (from database — matched to this product's exact funnel stage):
${journeyFacts}

Campaign Playbook (from database — matched to this product's industry):
${playbookFacts}

Creative Intelligence (from database — matched to this industry/funnel stage):
${creativeFacts}

Product Intelligence — Cross-Sell/Upsell (from database — exact/fuzzy product match):
${productIntelFacts}

Copy Angles available (from database): ${copyAngleFacts}
Creative Style recommendation (from database): ${creativeStyleFacts}

Persuasion Framework (from database — matched to top persona):
${persuasionFacts}

Creative Concept Grid (from database — this is real persona x psychology-principle
pairing, already computed. Do NOT invent additional concepts beyond this grid —
turn EACH numbered row below into exactly one creative concept):
${conceptGridFacts}

Buying Barriers → Solutions (from database, use to inform riskAnalysis and hiddenOpportunities):
${barrierSolutionFacts}

Customer Questions at this buying stage (from database — use verbatim, do not invent new ones):
${questionFacts}

Localization (from database — genuine country/currency data for "${country}"):
${localizationFacts}

=== YOUR TASK: STEP 7 — EXPLAIN EVERY RECOMMENDATION ===

Using ONLY the verified data above, produce the Decision Engine OUTPUT FORMAT as JSON.
Return ONLY this JSON object, no other text.
BREVITY IS REQUIRED — this response has a strict token budget. Include only the
TOP 8 interests in verifiedMetaInterests (highest-scoring primary/secondary
ones), not all 20. Keep every string field to the word limit stated for it.

{
  "productProfile": {
    "industry": "${report.industry}",
    "category": "${report.category}",
    "subcategory": "${report.subCategory || "N/A"}",
    "transformation": "1-2 sentences: what transformation this product delivers, based on the customer goals and pain points above"
  },
  "customerProfile": {
    "primaryPersona": "name of the top persona above",
    "painPoints": "the pain point(s) from the personas/problems above",
    "goals": "the customer goals listed above",
    "motivations": "the buying motivations listed above",
    "lifestyle": "1 sentence inferred ONLY from the Lifestyle-tier interests in the Verified Meta Interests list above — if none exist, say 'Not available in database'",
    "buyingIntent": "High/Medium/Low, based on the buying intent values of the interests above",
    "awarenessStage": "${report.funnelStage || "Awareness"}"
  },
  "verifiedMetaInterests": [
    {"interest": "name from list above", "confidence": "number from list above", "evidence": "max 12 words, rephrase the Reason field from the list above", "reasoningPath": "max 4 arrow-separated hops from the Path field above"}
  ],
  "campaignStrategy": {
    "objective": "${report.campaignObjective || "Awareness"}",
    "creative": "${report.bestCreativeFormat || "N/A"}, informed by the Creative Intelligence format/hook type/story framework above",
    "offer": "pick the single best-fit offer from the Offer Types list above, by name",
    "cta": "the Example CTA field for the chosen offer above, localized with the currency from the Localization data if relevant",
    "placement": "recommend placements based on the funnel stage above",
    "landingPage": "1 sentence on what the landing page should emphasize, based on the customer goals and Customer Questions above",
    "testingStructure": "1 sentence recommending ONE ad set containing all creative concepts below together (not split into separate testing/scaling campaigns) — Meta's algorithm now splits impressions between creatives within a single ad set based on which ones hook users, so isolating test creative into a separate low-budget campaign starves it of signal"
  },
  "creativeConceptLibrary": [
    {
      "concept": "short 2-4 word label for this angle, e.g. 'Fear of Judgment' or 'Time Scarcity'",
      "targetPersona": "the exact persona name this concept targets, from the Creative Concept Grid above",
      "psychologyPrinciple": "the exact principle name from the Creative Concept Grid row this concept is based on",
      "headline": "one headline that uses the persona's EXACT pain-point language from the grid above, not a paraphrase or generic version — this is what makes the concept a real targeting signal, not decoration",
      "recommendedFormat": "creative format from the Creative Intelligence or Creative Style data above",
      "cta": "a CTA in the style shown in the grid row's Example CTA style field"
    }
  ],
  "riskAnalysis": {
    "competition": "1 sentence, only if inferable from industry/benchmark data above — else 'Not available in database'",
    "audienceSaturation": "1 sentence based on how many verified interests exist and their tiers",
    "buyingDifficulty": "1 sentence based on the Buying Barriers listed above that apply to this product",
    "educationRequired": "1 sentence based on the funnel/awareness stage and Customer Questions above"
  },
  "hiddenOpportunities": {
    "additionalAudiences": "list any expansion-tier interests from the Verified Meta Interests list above as untested audiences",
    "crossSell": "use the Product Intelligence Cross-Sell field above if available — else 'Not available in database'",
    "upsell": "use the Product Intelligence Upsell field above if available — else 'Not available in database'",
    "objectionHandling": "for the top 1-2 Buying Barriers relevant to this product, state the matched Solution from the Buying Barriers → Solutions list above"
  },
  "explanationReport": {
    "decisionRulesUsed": "list the Decision Rule IDs applied above, or state none matched",
    "confidenceRulesUsed": "which Confidence Rule level applies to this ${matcherConfidence}/100 score",
    "evidenceUsed": "summarize what database tables were used: keyword matching, industry intelligence, persona database, etc.",
    "relationshipPaths": "summarize the relationship path pattern seen across the top 3 interests above",
    "finalConfidence": ${matcherConfidence}
  },
  "aiAudit": {
    "consistencyCheck": "Review each database-selected interest above against the product industry/category. Flag any that seem inconsistent and which DB mapping may have caused it.",
    "confidenceAssessment": "Explain the confidence score of ${matcherConfidence}/100 using the Confidence Rules above.",
    "databaseGaps": "Summarize the relationship-layer gaps listed above in plain language. Do not invent additional gaps."
  }
}`;

  const text = await callClaude({ system, prompt, maxTokens: 4096 });

  // Strip markdown fences if present, then extract JSON
  const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude returned non-JSON");

  const result = JSON.parse(jsonMatch[0]);

  // Hard safety: strip any interest/behavior/persona selection keys Claude may have added
  delete result.recommendedInterests;
  delete result.recommendedBehaviors;
  delete result.selectedInterests;
  delete result.personas;

  return result;
}

// ── Main server action ─────────────────────────────────────────────────────────
export async function createAnalysisRequest(
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { error: "You must be signed in to create an analysis." };

  const ctx = await getGuardForCurrentUser();
  if (!ctx) return { error: "Authentication error. Please sign in again." };

  const canRun = await ctx.guard.canAnalyze();
  if (!canRun.allowed) {
    switch (canRun.reason) {
      case "no_subscription":
        return {
          error: "You need an active plan. Visit /billing to get started.",
        };
      case "expired":
        return {
          error: "Your subscription has expired. Visit /billing to renew.",
        };
      case "limit_reached":
        return {
          error: `You've used all ${canRun.limit} analyses. Upgrade to Pro for unlimited.`,
        };
      default:
        return {
          error:
            "Your plan does not include audience analysis. Please upgrade.",
        };
    }
  }

  const productName = (formData.get("productName") as string)?.trim();
  const description =
    (formData.get("description") as string)?.trim() ?? "";
  const country = (formData.get("country") as string) ?? "Worldwide";
  const businessType =
    (formData.get("businessType") as string) ?? "Ecommerce";
  const objective = (formData.get("objective") as string) ?? "Sales";
  const imageFile = formData.get("image") as File | null;

  if (!productName) return { error: "Product name is required." };

  // Upload image
  let imageUrl: string | null = null;
  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split(".").pop() ?? "jpg";
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    await supabase.storage
      .from("analysis-images")
      .upload(filePath, imageFile, {
        contentType: imageFile.type,
        upsert: false,
      })
      .catch(() => null);
    const { data: pub } = supabase.storage
      .from("analysis-images")
      .getPublicUrl(filePath);
    imageUrl = pub?.publicUrl ?? null;
  }

  // Save request
  const { data: request, error: reqError } = await supabase
    .from("analysis_requests")
    .insert({
      user_id: user.id,
      product_name: productName,
      description: description || null,
      country,
      business_type: businessType,
      objective,
      image_url: imageUrl,
      status: "processing",
    })
    .select("id")
    .single();

  if (reqError || !request)
    return {
      error: `Failed to save request: ${reqError?.message ?? "unknown error"}`,
    };

  // ── STEP 1: Hierarchical DB Matcher (sole authority for interests) ─────────
  const matcherOut = runHierarchicalMatcher(
    {
      productName,
      description: description ?? "",
      businessType: businessType ?? "Ecommerce",
      objective: objective ?? "Sales",
      country: country ?? "Worldwide",
    },
    30,
  );

  // These are FINAL. Claude will not touch them.
  //
  // NOTE: the extended explainability fields (relationshipType, relationshipWeight,
  // relationshipDistance, sourceQuality, businessRelevance, personaMatch,
  // industryMatch, purchaseIntentScore, confidenceScore, databaseTable) are read
  // via a permissive cast rather than direct property access. This decouples the
  // build from matcher.ts's exact ScoredInterest shape — if an older matcher.ts
  // is ever deployed without these fields, they simply come through as undefined
  // at runtime instead of failing the TypeScript compile. Core fields (name,
  // mainCategory, score, tier, etc.) have existed on ScoredInterest since the
  // very first version of the matcher and are safe to access directly.
  const finalInterests: FinalInterest[] = matcherOut.interests.map((i) => {
    const ext = i as unknown as Record<string, unknown>;
    return {
      name: i.name,
      mainCategory: i.mainCategory,
      subCategory: i.subCategory,
      buyingIntent: i.buyingIntent,
      score: i.score,
      matchSource: i.reason,
      relationshipPath: i.relationshipPath,
      tier: i.tier,
      relationshipType: ext["relationshipType"] as string | undefined,
      relationshipWeight: ext["relationshipWeight"] as number | undefined,
      relationshipDistance: ext["relationshipDistance"] as number | undefined,
      sourceQuality: ext["sourceQuality"] as number | undefined,
      businessRelevance: ext["businessRelevance"] as number | undefined,
      personaMatch: ext["personaMatch"] as number | undefined,
      industryMatch: ext["industryMatch"] as number | undefined,
      purchaseIntentScore: ext["purchaseIntentScore"] as number | undefined,
      confidence: ext["confidence"] as string | undefined,
      confidenceScore: ext["confidenceScore"] as number | undefined,
      reason: i.reason,
      databaseTable: ext["databaseTable"] as string | undefined,
    };
  });

  // intelligence.ts reads behavior.reason and behavior.verification UNGUARDED
  // (no `|| ""` fallback) — both must always be a real string, never undefined.
  const finalBehaviors: FinalBehavior[] = matcherOut.behaviors.map((b) => ({
    id: b.id,
    category: b.category,
    parent: b.parent,
    child: b.child,
    metaAudience: b.metaAudience,
    matchSource: b.matchSource,
    reason: b.reason ?? b.matchSource ?? "Matched via keyword and behavior scoring",
    verification: b.confidence ?? "Verified",
  }));

  // ── STEP 2: Engine for personas, benchmarks, strategy ────────────────────
  const report = generateReport({
    productName,
    description,
    businessType,
    objective,
    country,
  });

  // ── STEP 3: Save — DB interests are the truth ─────────────────────────────
  // Use final DB interests; fall back to engine report interests if matcher returned none
  const matcherReturnedNothing = finalInterests.length === 0;
  if (matcherReturnedNothing) {
    // This should be rare — it means the Relationship Expansion Engine found
    // zero verified interests across all 10 layers. The most common cause is
    // a stale/incompatible smarkin-db.json (e.g. missing or empty
    // metaAdsInterest / keywordMappingDatabase tables) rather than a genuine
    // "no data exists for this product" case. Logged loudly so it shows up in
    // Vercel function logs, and flagged in the saved report so it's visible
    // without needing log access.
    console.error(
      `[Matcher fallback] runHierarchicalMatcher returned 0 interests for ` +
      `"${productName}". Falling back to engine.ts's thin single-pass matching. ` +
      `Check that smarkin-db.json is the current version (should contain a ` +
      `"knowledgeGraphRelationships" table and 267+ metaAdsInterest rows).`
    );
  }
  const savedInterests =
    finalInterests.length > 0 ? finalInterests : (report.interests ?? []);
  const savedBehaviors =
    finalBehaviors.length > 0 ? finalBehaviors : (report.behaviors ?? []);

  // NOTE: ai_enrichment, executive_summary, audience_insight, and
  // why_this_audience are saved with DB-only fallback text here — NOT Claude's
  // narrative. Claude runs AFTER this insert completes (see the after() call
  // below), so the user reaches the report page immediately with real
  // interests/behaviors/personas/demographics instead of waiting on a slow
  // network round-trip to Anthropic. The narrative fields are updated in
  // place once Claude finishes, typically a few seconds later.
  const { error: resultError } = await supabase
    .from("analysis_results")
    .insert({
      request_id: request.id,
      user_id: user.id,
      industry: report.industry,
      sector: report.sector,
      category: report.category,
      sub_category: report.subCategory,
      product_family: report.productFamily,
      product_type: report.productType,
      matched_keyword_count: report.matchedKeywordCount,
      match_confidence_level: report.matchConfidenceLevel,
      // ← DB decisions (Claude never touched these)
      interests: savedInterests,
      behaviors: savedBehaviors,
      demographics: report.demographics,
      personas: report.personas,
      problems: report.problems,
      campaign_objective: report.campaignObjective,
      objective_strategy: report.objectiveStrategy,
      audience_strategy: report.audienceStrategy,
      audience_strategy_best_for: report.audienceStrategyBestFor,
      funnel_stage: report.funnelStage,
      recommended_objective: report.recommendedObjective,
      creative_focus: report.creativeFocus,
      best_creative_format: report.bestCreativeFormat,
      placements: report.placements,
      creative_hooks: report.creativeHooks,
      optimization_tips: report.optimizationTips,
      customer_goals: report.customerGoals,
      buying_motivations: report.buyingMotivations,
      messaging_angles: report.messagingAngles,
      overall_score: report.overallScore,
      score_breakdown: report.scoreBreakdown,
      benchmarks: report.benchmarks,
      recommended_offers: report.recommendedOffers,
      creative_intelligence: report.creativeIntelligence,
      psychology_principles: report.psychologyPrinciples,
      journey_stage: report.journeyStage,
      playbook: report.playbook,
      knowledge_graph_path: report.knowledgeGraphPath,
      explainability: {
        ...report.explainability,
        audienceSections: {
          primary:   matcherOut.sections.primary.map(i => i.name),
          secondary: matcherOut.sections.secondary.map(i => i.name),
          expansion: matcherOut.sections.expansion.map(i => i.name),
        },
        relationshipGaps: matcherOut.gaps,
        mergedCandidateCount: matcherOut.mergedCandidateCount,
        layerDiagnostics: matcherOut.layerDiagnostics,
        matcherFellBackToLegacyEngine: matcherReturnedNothing,
        aiEnrichmentPending: true,  // client polls on this flag until Claude finishes
      },
      // DB-only text for now — Claude's version overwrites these in the background
      executive_summary: report.executiveSummary ?? "",
      audience_insight: report.audienceInsight ?? "",
      why_this_audience: report.whyThisAudience ?? "",
      ai_enrichment: null,
    });

  if (resultError) {
    await supabase
      .from("analysis_requests")
      .update({ status: "failed" })
      .eq("id", request.id);
    return {
      error: `Report generated but could not be saved: ${resultError.message}`,
    };
  }

  await supabase
    .from("analysis_requests")
    .update({ status: "completed" })
    .eq("id", request.id);
  await ctx.guard.incrementUsage();

  // ── STEP 4: Claude runs AFTER the response is sent — never blocks the user ──
  // after() (stable in Next.js 15) keeps the serverless function alive just
  // long enough to finish this work, without holding up the redirect below.
  // The report page polls analysis_results for aiEnrichmentPending to flip
  // false and re-fetches once it does.
  after(async () => {
    let enriched: Record<string, unknown> = {};
    try {
      enriched = await enrichWithClaude(
        productName,
        description,
        objective,
        country,
        report,
        finalInterests,
        finalBehaviors,
        matcherOut.matchLevel,
        matcherOut.confidence,
        matcherOut.gaps,
      );
    } catch (err) {
      console.error("[Claude enrichment failed]", err);
    }

    const updatePayload: Record<string, unknown> = {
      explainability: {
        ...report.explainability,
        audienceSections: {
          primary:   matcherOut.sections.primary.map(i => i.name),
          secondary: matcherOut.sections.secondary.map(i => i.name),
          expansion: matcherOut.sections.expansion.map(i => i.name),
        },
        relationshipGaps: matcherOut.gaps,
        mergedCandidateCount: matcherOut.mergedCandidateCount,
        layerDiagnostics: matcherOut.layerDiagnostics,
        matcherFellBackToLegacyEngine: matcherReturnedNothing,
        aiEnrichmentPending: false,
      },
    };

    if (enriched.productProfile) {
      updatePayload.executive_summary = String(
        (enriched.productProfile as Record<string,unknown> | undefined)?.transformation ?? report.executiveSummary ?? "",
      );
      updatePayload.audience_insight = String(
        enriched.customerProfile
          ? `${(enriched.customerProfile as Record<string,unknown>).primaryPersona ?? ""}. ${(enriched.customerProfile as Record<string,unknown>).motivations ?? ""}`.trim()
          : report.audienceInsight ?? "",
      );
      updatePayload.why_this_audience = String(
        (enriched.explanationReport as Record<string,unknown> | undefined)?.relationshipPaths ?? report.whyThisAudience ?? "",
      );
      updatePayload.ai_enrichment = {
        productProfile: enriched.productProfile ?? null,
        customerProfile: enriched.customerProfile ?? null,
        verifiedMetaInterests: enriched.verifiedMetaInterests ?? [],
        campaignStrategy: enriched.campaignStrategy ?? null,
        creativeConceptLibrary: enriched.creativeConceptLibrary ?? [],
        riskAnalysis: enriched.riskAnalysis ?? null,
        hiddenOpportunities: enriched.hiddenOpportunities ?? null,
        explanationReport: enriched.explanationReport ?? null,
        aiAudit: enriched.aiAudit ?? null,
        interestCount: savedInterests.length,
        behaviorCount: savedBehaviors.length,
        matcherConfidence: matcherOut.confidence,
        matchLevel: matcherOut.matchLevel,
        debugPath: matcherOut.debugPath,
        enrichedAt: new Date().toISOString(),
      };
    }

    const bgSupabase = await createClient();
    await bgSupabase
      .from("analysis_results")
      .update(updatePayload)
      .eq("request_id", request.id);
  });

  redirect(`/analysis/${request.id}`);
  return {};
}

/**
 * Motivation Analyzer — builds Desires, BuyingMotivation, and
 * BuyingObjection[] from real persona data and the same HAS_OBJECTION graph
 * edges already used elsewhere in this codebase (marketingReasoningEngine.ts
 * reads the identical edge type internally; that logic isn't exported, so
 * this reads the same real database directly rather than duplicating
 * business logic or modifying existing infrastructure to expose it).
 */
import { BusinessIntelligenceProfile } from "../../../businessIntelligenceEngine";
import { Desires, BuyingMotivation, BuyingObjection } from "../types";
import { BusinessContext } from "../../../knowledge/taxonomy/types";
import { resolveIndustryKnowledge } from "../../../knowledge/packs/resolver";
import DB_RAW from "../../../smarkin-db.json";

type Row = Record<string, unknown>;
const DB_ANY = DB_RAW as unknown as Record<string, Row[] | undefined>;
const EDGES = (DB_ANY["edges"] ?? []) as Row[];
const BUYING_BARRIERS = (DB_ANY["buyingbarriers"] ?? []) as Row[];
const BUYING_SOLUTIONS = (DB_ANY["buyingsolutions"] ?? []) as Row[];
const PERSONA_DB = (DB_ANY["customerPersonaDatabase"] ?? []) as Row[];

function s(v: unknown): string { return v == null ? "" : String(v).toLowerCase().trim(); }
function str(v: unknown): string { return v == null ? "" : String(v).trim(); }

const BARRIER_CATEGORY_KEYWORDS: Record<BuyingObjection["category"], string[]> = {
  price: ["price", "expensive", "cost", "afford", "budget"],
  trust: ["trust", "scam", "fake", "legit", "reviews"],
  timing: ["time", "later", "not now", "busy"],
  competitors: ["competitor", "alternative", "other option", "already use"],
  complexity: ["complex", "complicated", "hard to use", "confusing"],
  risk: ["risk", "guarantee", "refund", "warranty"],
};

function categorizeObjection(objectionText: string): BuyingObjection["category"] {
  const t = s(objectionText);
  for (const [category, keywords] of Object.entries(BARRIER_CATEGORY_KEYWORDS)) {
    if (keywords.some(k => t.includes(k))) return category as BuyingObjection["category"];
  }
  return "trust"; // conservative default — trust is the most common underlying blocker when text doesn't match a specific category
}

export function analyzeMotivations(
  profile: BusinessIntelligenceProfile,
  personaNames: string[],
  gaps: string[],
  businessContext?: BusinessContext,
): { desires: Desires; buyingMotivations: BuyingMotivation; buyingObjections: BuyingObjection[] } {
  // Same pack-priority principle as personaGenerator.ts and
  // painPointAnalyzer.ts: a pack-covered business's own real buying
  // motivations and objections are authoritative, never blended with the
  // generic HAS_OBJECTION graph search.
  if (businessContext) {
    const resolved = resolveIndustryKnowledge(businessContext);
    if (resolved.hasPack) {
      gaps.push(...resolved.gaps);
      const goals: string[] = [];
      const logicalMotivations: string[] = [];
      const objections: BuyingObjection[] = [];
      const seenObjections = new Set<string>();

      for (const persona of resolved.personas) {
        goals.push(...persona.goals);
        logicalMotivations.push(...persona.buyingMotivations);
        for (const objectionText of persona.objections) {
          if (seenObjections.has(objectionText)) continue;
          seenObjections.add(objectionText);
          const category = categorizeObjection(objectionText);
          const solutionRow = BUYING_SOLUTIONS.find(r => s(r["Barrier"]) === s(category));
          objections.push({ category, objection: objectionText, recommendedSolution: solutionRow ? str(solutionRow["Best Solution"]) : null });
        }
      }

      return {
        desires: { primary: goals, secondary: [], emotional: [], identity: [] },
        buyingMotivations: { logical: logicalMotivations, emotional: [], fearBased: [], aspirational: [] },
        buyingObjections: objections,
      };
    }
  }

  const logicalMotivations: string[] = [];
  const emotionalMotivations: string[] = [];
  const objections: BuyingObjection[] = [];
  const seenObjections = new Set<string>();
  const goals: string[] = [];

  // Enriched from the MERGED persona list (graph + tag-overlap), reading
  // customerPersonaDatabase directly — reading only profile.customerProfile.personas
  // here would reproduce the exact bug already found and fixed twice this
  // session (getPersonaNames(), executionBriefGenerator.ts's pain-point
  // lookup): that list is tag-overlap only and is empty for products like
  // "Whey Protein" where only the Knowledge Graph found real personas.
  for (const name of personaNames) {
    const dbRow = PERSONA_DB.find(r => s(r["Persona Name"]) === s(name));
    if (dbRow) {
      const goal = str(dbRow["Primary Goal"]);
      const motivation = str(dbRow["Buying Motivation"]);
      if (goal) goals.push(goal);
      if (motivation) logicalMotivations.push(motivation);
    }
  }

  for (const name of personaNames) {
    const objectionEdges = EDGES.filter(e => str(e["Relationship"]) === "HAS_OBJECTION" && s(e["Source"]) === s(name));
    for (const edge of objectionEdges) {
      const objectionText = str(edge["Target"]);
      if (seenObjections.has(objectionText)) continue;
      seenObjections.add(objectionText);

      const category = categorizeObjection(objectionText);
      const solutionRow = BUYING_SOLUTIONS.find(r => s(r["Barrier"]) === s(category));
      objections.push({
        category,
        objection: objectionText,
        recommendedSolution: solutionRow ? str(solutionRow["Best Solution"]) : null,
      });
    }
  }

  if (objections.length === 0) {
    gaps.push("No HAS_OBJECTION edges found for the identified personas — Buying Objections section is empty.");
  }
  if (BUYING_BARRIERS.length === 0) {
    gaps.push("buyingbarriers reference table is empty — objection categorization has no verified category list to check against.");
  }

  const desires: Desires = {
    primary: goals,
    secondary: [],
    emotional: emotionalMotivations,
    identity: [],
  };
  if (desires.secondary.length === 0 && desires.identity.length === 0) {
    gaps.push("No database field distinguishes secondary or identity-level desires from primary goals — those two arrays are honestly empty rather than duplicating primary desires to look complete.");
  }

  const buyingMotivations: BuyingMotivation = {
    logical: logicalMotivations,
    emotional: [],
    fearBased: [],
    aspirational: [],
  };
  if (buyingMotivations.emotional.length === 0) {
    gaps.push("customerPersonaDatabase's Buying Motivation field isn't classified as logical vs. emotional vs. fear-based vs. aspirational — all current data is placed under 'logical' since that's the only real signal available; the other three arrays are honestly empty, not fabricated.");
  }

  return { desires, buyingMotivations, buyingObjections: objections };
}

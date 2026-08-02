/**
 * Persona Generator — reads the ALREADY-COMPUTED BusinessIntelligenceProfile
 * (via the existing Business Intelligence Cache, per the "reuse, don't
 * regenerate" requirement) and reshapes it into structured CustomerPersona
 * objects, enriched with real customerPersonaDatabase fields.
 *
 * Honest limitation, disclosed rather than papered over: customerPersonaDatabase
 * has no age/occupation/income/lifestyle columns — only goal, pain point,
 * motivation, and product-category data. Those four demographic fields are
 * null whenever the source data doesn't specify them, never fabricated to
 * look complete. This is the same "log the gap, don't invent" discipline
 * every other engine in this codebase follows.
 */
import { BusinessIntelligenceProfile, getPersonaNames } from "../../../businessIntelligenceEngine";
import { CustomerPersona } from "../types";
import { BusinessContext } from "../../../knowledge/taxonomy/types";
import { phraseMatches, normalize } from "../../../knowledge/engine/businessUnderstandingEngine";
import { resolveIndustryKnowledge } from "../../../knowledge/packs/resolver";
import DB_RAW from "../../../smarkin-db.json";

type Row = Record<string, unknown>;
const DB_ANY = DB_RAW as unknown as Record<string, Row[] | undefined>;
const PERSONA_DB = (DB_ANY["customerPersonaDatabase"] ?? []) as Row[];

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

/**
 * A persona is "in category" if its own Common Product Categories or AI
 * Search Tags genuinely phrase-match the classified BusinessContext's
 * products/aliases/keywords — using the exact same whole-phrase matching
 * discipline that fixed the Business Understanding Engine's own false
 * positives, applied here to prevent the identical failure mode in
 * Customer Research's persona matching (a "Weekend Golfer" persona tagged
 * "golf equipment" no longer surfaces for an Agriculture-classified
 * business, since "agricultural equipment" and "golf equipment" share no
 * real phrase).
 */
function personaMatchesCategory(dbRow: Row | undefined, context: BusinessContext): boolean {
  if (!dbRow) return false;
  const personaText = normalize(`${str(dbRow["Common Product Categories"])} ${str(dbRow["AI Search Tags"])}`);
  const categoryTerms = [context.industry, ...context.products, ...context.aliases, context.category, context.subcategory].filter((t): t is string => !!t);
  return categoryTerms.some(term => phraseMatches(personaText, term));
}

export function generatePersonas(
  profile: BusinessIntelligenceProfile,
  gaps: string[],
  businessContext?: BusinessContext,
): CustomerPersona[] {
  // Phase 2 — Industry Pack takes priority over generic matching entirely.
  // When a business classifies into a pack-covered category, this is
  // authoritative: real, category-specific personas if the pack has them,
  // or an honest, empty gap if it doesn't — never a fallback to the
  // generic global search, which is exactly the "unrelated persona from a
  // different category" failure mode this whole effort has been fixing.
  // Businesses outside any Industry Pack's coverage are completely
  // unaffected — they fall through to the existing logic below unchanged.
  if (businessContext) {
    const resolved = resolveIndustryKnowledge(businessContext);
    if (resolved.hasPack) {
      gaps.push(...resolved.gaps);
      return resolved.personas.map((p): CustomerPersona => ({
        name: p.personaName,
        ageRange: null, // Industry Pack personas don't carry demographic fields yet — honestly null, not fabricated
        occupation: null,
        incomeLevel: null,
        lifestyle: null,
        primaryGoal: p.goals[0] ?? "",
        buyingPower: "Unknown",
        experienceLevel: "Unknown",
        source: "industry-pack",
        frustrations: p.frustrations,
        decisionCriteria: p.decisionCriteria,
        emotionalDrivers: p.emotionalDrivers,
        customerJourney: p.customerJourney,
        typicalBudget: p.typicalBudget,
      }));
    }
  }

  const tagBasedNames = new Set(profile.customerProfile.personas.map(p => p.name));
  const graphBasedNames = new Set(profile.knowledgeGraphProfile.connectedPersonas);
  let mergedNames = getPersonaNames(profile);

  if (mergedNames.length === 0) {
    gaps.push("No personas found via either the Knowledge Graph or tag-overlap lookup — persona-dependent research sections will be empty.");
    return [];
  }

  // Category-scoped filtering — ONLY applied when Business Understanding
  // classified this business with real confidence. When unmatched (a
  // business type not yet in the taxonomy), this falls through completely
  // unchanged to the original global matching — every previously-tested
  // product outside the current taxonomy's 14 industries keeps working
  // exactly as it did before this integration.
  if (businessContext?.matched) {
    const beforeCount = mergedNames.length;
    const filtered = mergedNames.filter(name => {
      const dbRow = PERSONA_DB.find(r => str(r["Persona Name"]) === name);
      return personaMatchesCategory(dbRow, businessContext);
    });
    if (filtered.length > 0) {
      const removed = beforeCount - filtered.length;
      if (removed > 0) {
        gaps.push(`Business Understanding classified this as ${businessContext.industry}/${businessContext.category} — ${removed} persona(s) found via the original global search were excluded as belonging to a different category.`);
      }
      mergedNames = filtered;
    } else {
      gaps.push(`Business Understanding classified this as ${businessContext.industry}/${businessContext.category}, but no personas in customerPersonaDatabase match that category — falling back to the unfiltered result rather than returning nothing.`);
    }
  }

  const personas: CustomerPersona[] = [];
  for (const name of mergedNames) {
    const dbRow = PERSONA_DB.find(r => str(r["Persona Name"]) === name);
    const inTag = tagBasedNames.has(name);
    const inGraph = graphBasedNames.has(name);

    if (!dbRow) {
      gaps.push(`Persona "${name}" was found via ${inGraph ? "the Knowledge Graph" : "tag overlap"}, but has no row in customerPersonaDatabase — demographic/motivation enrichment unavailable for this persona.`);
    }

    personas.push({
      name,
      ageRange: null, // no source column exists — never fabricated
      occupation: null,
      incomeLevel: null,
      lifestyle: null,
      primaryGoal: dbRow ? str(dbRow["Primary Goal"]) : (profile.customerProfile.personas.find(p => p.name === name)?.goal ?? ""),
      buyingPower: "Unknown", // no source column exists
      experienceLevel: "Unknown",
      source: inGraph && inTag ? "both" : inGraph ? "knowledge-graph" : "tag-overlap",
    });
  }

  return personas;
}

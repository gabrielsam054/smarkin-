/**
 * Pain Point Analyzer — reads persona-level pain points (customerPersonaDatabase's
 * "Primary Pain Point" field) and Knowledge Graph pain points
 * (profile.knowledgeGraphProfile.connectedPainPoints), which is a real,
 * verified edge type (Persona -HAS_PAIN_POINT-> Pain Point) already used
 * throughout this codebase. Urgency scoring reflects source confidence, not
 * an invented severity judgment.
 */
import { BusinessIntelligenceProfile } from "../../../businessIntelligenceEngine";
import { PainPoint } from "../types";
import { BusinessContext } from "../../../knowledge/taxonomy/types";
import { resolveIndustryKnowledge } from "../../../knowledge/packs/resolver";

export function analyzePainPoints(
  profile: BusinessIntelligenceProfile,
  gaps: string[],
  businessContext?: BusinessContext,
): PainPoint[] {
  // Same pack-priority principle as personaGenerator.ts: when a business
  // classifies into a pack-covered category, its personas' own real pain
  // points are authoritative — never blended with the generic global
  // search, which would reintroduce exactly the cross-category
  // contamination this whole effort has been removing.
  if (businessContext) {
    const resolved = resolveIndustryKnowledge(businessContext);
    if (resolved.hasPack) {
      gaps.push(...resolved.gaps);
      const painPoints: PainPoint[] = [];
      for (const persona of resolved.personas) {
        for (const description of persona.painPoints) {
          painPoints.push({
            description,
            category: "top-frustration",
            urgencyScore: 85, // same confidence tier as verified Knowledge Graph edges — real, curated pack content, not a generic database match
            source: `Industry Pack (${resolved.pack?.industry} → ${resolved.category?.category} → ${persona.personaName})`,
          });
        }
      }
      return painPoints;
    }
  }

  const painPoints: PainPoint[] = [];
  const seen = new Set<string>();

  // Knowledge-Graph-sourced pain points — verified edges, highest confidence.
  for (const pp of profile.knowledgeGraphProfile.connectedPainPoints) {
    if (seen.has(pp)) continue;
    seen.add(pp);
    painPoints.push({
      description: pp,
      category: "top-frustration",
      urgencyScore: 85, // verified graph edge — high confidence, not the maximum, since severity itself isn't independently measured
      source: "Knowledge Graph (Persona -HAS_PAIN_POINT-> Pain Point)",
    });
  }

  // Persona-database-sourced pain points — tag-overlap-derived personas,
  // lower confidence than a verified graph edge.
  for (const persona of profile.customerProfile.personas) {
    if (!persona.painPoint || seen.has(persona.painPoint)) continue;
    seen.add(persona.painPoint);
    painPoints.push({
      description: persona.painPoint,
      category: "daily-problem",
      urgencyScore: 65,
      source: "customerPersonaDatabase (tag-overlap match)",
    });
  }

  if (painPoints.length === 0) {
    gaps.push("No pain points found via either the Knowledge Graph or persona database — Pain Point Discovery stage produced no results.");
  }

  return painPoints;
}

import { BusinessContext } from "../taxonomy/types";
import { classifyAgainstPacks, getPackPersonas } from "./registry";
import { IndustryPack, CategoryProfile, IndustryPersona } from "./types";

/**
 * Phase 5 — the single resolver every capability calls instead of doing
 * its own pack lookup. "No capability should perform its own Industry
 * Pack lookup" taken literally: Business Intelligence, Customer Research,
 * Audience Research, and Advertising all call THIS function, not
 * classifyAgainstPacks() directly.
 */
export interface ResolvedKnowledge {
  hasPack: boolean;
  pack: IndustryPack | null;
  category: CategoryProfile | null;
  personas: IndustryPersona[];
  confidence: number;
  evidence: { matchedPhrase: string | null; source: string | null };
  gaps: string[];
}

/**
 * Memoization — closes the inefficiency disclosed in the CE Production
 * Completion report: this resolver was called 4× per pipeline run
 * (persona generator, pain point analyzer, motivation analyzer, and the
 * BI enrichment step), each recomputing the identical classification.
 * Caching here rather than threading a resolved value through four
 * function signatures keeps every existing caller and committed test
 * unchanged, and automatically covers future call sites too. This is
 * safe because the function is pure over static, in-code pack data —
 * there is nothing to go stale. The cache is bounded to guard against
 * unbounded memory in a long-lived process.
 */
const RESOLVER_CACHE = new Map<string, ResolvedKnowledge>();
const RESOLVER_CACHE_MAX = 500;

export function resolveIndustryKnowledge(businessContext: BusinessContext): ResolvedKnowledge {
  const cacheKey = businessContext.rawInput;
  const cached = RESOLVER_CACHE.get(cacheKey);
  if (cached) return cached;

  const result = resolveUncached(businessContext);

  if (RESOLVER_CACHE.size >= RESOLVER_CACHE_MAX) RESOLVER_CACHE.clear();
  RESOLVER_CACHE.set(cacheKey, result);
  return result;
}

function resolveUncached(businessContext: BusinessContext): ResolvedKnowledge {
  // Uses the ORIGINAL raw input, not a reconstruction from taxonomy
  // labels — reconstructing loses fidelity (e.g. "Consumer Electronics
  // Computers Laptops" only weakly keyword-matches the pack's real
  // "laptop store" alias, understating confidence versus classifying the
  // real original text directly).
  const classification = businessContext.rawInput ? classifyAgainstPacks(businessContext.rawInput) : null;

  if (!classification) {
    return {
      hasPack: false, pack: null, category: null, personas: [],
      confidence: 0, evidence: { matchedPhrase: null, source: null },
      gaps: [`No Industry Pack covers "${businessContext.rawInput || "this business"}" — falling back to existing general-purpose matching.`],
    };
  }

  const personas = getPackPersonas(classification);
  const gaps: string[] = [];
  if (personas.length === 0) {
    gaps.push(`Industry Pack matched category "${classification.category.category}", but no persona is defined for it yet — returning an honest gap rather than an unrelated persona from a different category.`);
  }

  return {
    hasPack: true,
    pack: classification.pack,
    category: classification.category,
    personas,
    confidence: classification.confidence,
    evidence: { matchedPhrase: classification.matchedPhrase, source: classification.pack.source },
    gaps,
  };
}

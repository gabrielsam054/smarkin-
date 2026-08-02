import { IndustryPack, CategoryProfile, IndustryPersona } from "./types";
import { CONSUMER_ELECTRONICS_PACK } from "./consumerElectronics";
import { normalize, phraseMatches } from "../engine/businessUnderstandingEngine";

/**
 * The pack registry — a real, bounded list, not a claim of covering every
 * industry. Adding a second completed pack means adding one entry here;
 * nothing else in this file changes, matching the same registration-style
 * extension discipline used throughout the rest of this codebase.
 */
export const INDUSTRY_PACKS: IndustryPack[] = [CONSUMER_ELECTRONICS_PACK];

export interface PackClassification {
  pack: IndustryPack;
  category: CategoryProfile;
  matchedPhrase: string;
  confidence: number;
}

/**
 * Same whole-phrase matching discipline proven in the taxonomy engine —
 * an alias match is strong (near the category's own confidenceHint), a
 * keyword-only match is weaker supporting evidence. Reused, not
 * reimplemented, from businessUnderstandingEngine.ts.
 */
export function classifyAgainstPacks(description: string): PackClassification | null {
  const input = normalize(description);
  let best: PackClassification | null = null;

  for (const pack of INDUSTRY_PACKS) {
    for (const category of pack.categories) {
      const { aliases, keywords, confidenceHint } = category.classificationRules;
      const matchedAlias = aliases.find(a => phraseMatches(input, a));
      const matchedKeyword = keywords.find(k => phraseMatches(input, k));
      const matched = matchedAlias ?? matchedKeyword;
      if (!matched) continue;

      const confidence = matchedAlias ? confidenceHint : Math.round(confidenceHint * 0.6);
      if (!best || confidence > best.confidence) {
        best = { pack, category, matchedPhrase: matched, confidence };
      }
    }
  }

  return best;
}

export function getPackPersonas(classification: PackClassification): IndustryPersona[] {
  return classification.pack.personas.filter(p => p.category === classification.category.category);
}

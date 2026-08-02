import { TAXONOMY } from "../taxonomy/data";
import { ClassificationMatch, BusinessContext } from "../taxonomy/types";

/**
 * The direct fix for the PAT's root cause. The old matching approach
 * counted individual shared WORDS ("equipment" alone matched "golf
 * equipment" against "agricultural equipment"). This engine matches
 * ALIASES AND KEYWORDS AS WHOLE PHRASES (substring containment), never
 * counting a single generic word as a match on its own. "agricultural
 * equipment" contains none of "golf equipment"'s real keyword phrases —
 * the false match is structurally impossible here, not just less likely.
 */
export interface BusinessUnderstanding {
  industry: string | null;
  category: string | null;
  subcategory: string | null;
  confidence: number;
  matchedPhrase: string | null;
  source: string | null;
  gaps: string[];
}

export function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ");
}

/**
 * A phrase counts as matched only if it appears as a genuine substring of
 * the normalized input — not word-by-word overlap counting. A single word
 * like "equipment" is never checked in isolation unless it IS itself the
 * entire alias/keyword (which none of this taxonomy's generic terms are).
 */
export function phraseMatches(input: string, phrase: string): boolean {
  return input.includes(normalize(phrase));
}

export function classifyBusiness(description: string): BusinessUnderstanding {
  const input = normalize(description);
  const gaps: string[] = [];

  const matches: ClassificationMatch[] = [];
  for (const node of TAXONOMY) {
    const matchedAliases = node.aliases.filter(a => phraseMatches(input, a));
    const matchedKeywords = node.keywords.filter(k => phraseMatches(input, k));
    const matched = [...matchedAliases, ...matchedKeywords];
    if (matched.length === 0) continue;

    // An alias match is direct, strong evidence (the input essentially
    // states the business type, e.g. "laptop store") — scored near the
    // node's own confidenceHint. Keyword-only matches are supporting
    // evidence (e.g. "laptop repair" without ever saying "laptop store"),
    // scored lower. Multiple keyword matches add real, if smaller, weight.
    const score = matchedAliases.length > 0
      ? Math.min(100, 90 + (matchedAliases.length - 1) * 5)
      : Math.min(70, 40 + (matchedKeywords.length - 1) * 10);
    matches.push({ node, matchedOn: matched, score });
  }

  if (matches.length === 0) {
    gaps.push(`No taxonomy node matched "${description}" — this business type isn't in the current knowledge base yet. Returning unknown rather than a fabricated guess.`);
    return { industry: null, category: null, subcategory: null, confidence: 0, matchedPhrase: null, source: null, gaps };
  }

  matches.sort((a, b) => b.score - a.score);
  const best = matches[0];

  // Final confidence: the node's own confidenceHint (how distinctive this
  // category is in general) scaled by how strong THIS specific match was
  // — never a flat, asserted number independent of the actual match.
  const confidence = Math.round(best.node.confidenceHint * (best.score / 100));

  if (matches.length > 1 && matches[1].score >= best.score * 0.8) {
    gaps.push(`Ambiguous match: "${matches[1].node.category}" scored nearly as high as the winning category "${best.node.category}" — classification is less certain than the confidence score alone suggests.`);
  }

  return {
    industry: best.node.industry,
    category: best.node.category,
    subcategory: best.node.subcategory,
    confidence,
    matchedPhrase: best.matchedOn[0],
    source: best.node.source,
    gaps,
  };
}

/**
 * The shared BusinessContext producer every capability now calls, instead
 * of independently parsing raw input. Reuses classifyBusiness()'s real
 * matching logic directly — this function is a thin reshaping layer, not
 * a second implementation of classification.
 */
export function buildBusinessContext(description: string): BusinessContext {
  const result = classifyBusiness(description);

  if (!result.industry) {
    return {
      matched: false, rawInput: description, industry: null, category: null, subcategory: null,
      products: [], aliases: [], confidence: 0,
      evidence: { matchedPhrase: null, source: null }, gaps: result.gaps,
    };
  }

  // Find the exact node again to pull its full products/aliases list —
  // classifyBusiness()'s own return shape doesn't carry products, since
  // that field wasn't needed for classification itself, only for what
  // downstream capabilities consume afterward.
  const node = TAXONOMY.find(n =>
    n.industry === result.industry && n.category === result.category && n.subcategory === result.subcategory,
  );

  return {
    matched: true,
    rawInput: description,
    industry: result.industry,
    category: result.category,
    subcategory: result.subcategory,
    products: node?.products ?? [],
    aliases: node?.aliases ?? [],
    confidence: result.confidence,
    evidence: { matchedPhrase: result.matchedPhrase, source: result.source },
    gaps: result.gaps,
  };
}

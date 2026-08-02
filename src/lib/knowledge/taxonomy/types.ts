/**
 * Smarkin OS — Business Taxonomy Types
 *
 * The direct fix for the PAT's root cause: "Agricultural Equipment"
 * matched a golf persona because both happened to share the single,
 * generic word "equipment" in a global word-overlap search across all 72
 * personas with no category boundary. A TaxonomyNode's aliases/keywords
 * are checked FIRST, narrowing to a specific category before any
 * downstream persona/interest matching runs — matching then happens
 * within that category, not globally.
 */

export interface TaxonomyNode {
  id: string;
  parentId: string | null;
  industry: string;
  category: string | null;
  subcategory: string | null;
  products: string[];       // real, specific product/service names this category covers — required for Business Intelligence integration
  aliases: string[];       // real alternate names a user might type ("laptop store" for "Refurbished Laptops")
  keywords: string[];       // distinctive, multi-word phrases preferred over single generic words
  confidenceHint: number;   // 0-100, how distinctive/reliable a match on this node is
  source: string;
  version: string;
  lastUpdated: string;
}

export interface ClassificationMatch {
  node: TaxonomyNode;
  matchedOn: string[]; // which aliases/keywords actually matched, for evidence
  score: number;
}

/**
 * The shared object every intelligence capability now consumes, instead
 * of each independently re-parsing the raw user input. `matched: false`
 * means classifyBusiness() found nothing — every field is honestly null/
 * empty, never a guess, and every downstream capability's fallback logic
 * checks this flag before deciding whether to narrow its own matching.
 */
export interface BusinessContext {
  matched: boolean;
  rawInput: string; // the original description, preserved so downstream resolvers (pack lookup) can classify with full fidelity instead of reconstructing from labels
  industry: string | null;
  category: string | null;
  subcategory: string | null;
  products: string[];
  aliases: string[];
  confidence: number;
  evidence: { matchedPhrase: string | null; source: string | null };
  gaps: string[];
}

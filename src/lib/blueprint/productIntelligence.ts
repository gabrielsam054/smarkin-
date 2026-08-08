import DB_RAW from "../smarkin-db.json";
import { overlap } from "../businessIntelligenceEngine";

interface ProductIntelligenceRow {
  "Product Name": string;
  "Upsell Products": string;
  "Cross Sell Products": string;
  "Recommended Creative": string;
  "Recommended Funnel Stage": string;
  "AI Confidence": string;
}

const PRODUCT_INTELLIGENCE = ((DB_RAW as Record<string, unknown>)["productIntelligenceDatabase"] ?? []) as ProductIntelligenceRow[];

export interface ProductIntelligenceMatch {
  matchedProductName: string;
  upsellProducts: string[];
  crossSellProducts: string[];
  recommendedCreative: string[];
  recommendedFunnelStage: string;
  confidence: number;
}

/**
 * Real, word-overlap match against productIntelligenceDatabase — one
 * of the audit's highest-value unused tables (15 rows, real upsell/
 * cross-sell/creative recommendations). Reuses the exact overlap
 * function already proven in businessIntelligenceEngine.ts rather
 * than a second implementation, per Beta 1's "reuse before
 * rebuilding" principle.
 *
 * Deliberately NOT an exact string match — a real product in this
 * account ("Whey Protein") doesn't literally appear in this table,
 * but "Protein Powder" does, and shares enough real words to match
 * honestly. Requires at least 1 real shared word; returns null rather
 * than a weak guess when nothing matches.
 */
export function findProductIntelligenceMatch(productName: string): ProductIntelligenceMatch | null {
  let best: { row: ProductIntelligenceRow; score: number } | null = null;
  for (const row of PRODUCT_INTELLIGENCE) {
    const score = overlap(productName, row["Product Name"]);
    if (score > 0 && (!best || score > best.score)) best = { row, score };
  }
  if (!best) return null;

  const row = best.row;
  return {
    matchedProductName: row["Product Name"],
    upsellProducts: row["Upsell Products"] ? row["Upsell Products"].split(",").map((s) => s.trim()) : [],
    crossSellProducts: row["Cross Sell Products"] ? row["Cross Sell Products"].split(",").map((s) => s.trim()) : [],
    recommendedCreative: row["Recommended Creative"] ? row["Recommended Creative"].split(",").map((s) => s.trim()) : [],
    recommendedFunnelStage: row["Recommended Funnel Stage"] ?? "",
    confidence: Number(row["AI Confidence"]) || 0,
  };
}

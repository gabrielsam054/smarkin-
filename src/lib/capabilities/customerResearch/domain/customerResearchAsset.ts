/**
 * Smarkin OS — Customer Research Domain Model
 *
 * CustomerResearchAsset is the persisted, versioned unit — distinct from
 * CustomerResearchResult (types.ts), which is the raw structured output of
 * running the research pipeline. An Asset wraps a Result with identity
 * (who owns it, which business, which version) and the two version fields
 * that make caching correct: researchVersion (this capability's own logic
 * version — bump when the research algorithm itself changes) and
 * sourceDataVersion (the underlying smarkin-db.json version — same field
 * and same staleness discipline already proven in businessIntelligenceCache.ts).
 * Reusing that exact discipline here, not inventing a parallel one.
 */
import { CustomerResearchResult } from "../types";

export const CURRENT_RESEARCH_LOGIC_VERSION = "1.0.0";

export interface CustomerResearchAsset {
  id: string | null; // null until persisted — a freshly-generated, not-yet-saved asset has no row id yet
  userId: string;
  businessId: string; // product/business name — same composite-key pattern as business_intelligence_profiles
  versionNumber: number; // explicit, auto-incrementing per (userId, businessId) — not inferred from timestamp ordering alone
  researchLogicVersion: string;
  sourceDataVersion: string;

  personaNames: string[]; // the exact merged persona list Advertising now consumes, instead of recomputing it independently
  result: CustomerResearchResult;

  createdAt: string;
  updatedAt: string;
}

export function isAssetFresh(asset: CustomerResearchAsset, currentSourceDataVersion: string): boolean {
  return asset.researchLogicVersion === CURRENT_RESEARCH_LOGIC_VERSION
    && asset.sourceDataVersion === currentSourceDataVersion;
}

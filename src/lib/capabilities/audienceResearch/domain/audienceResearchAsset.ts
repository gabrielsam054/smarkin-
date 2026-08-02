import { AudienceResearchResult } from "../types";

export const CURRENT_AUDIENCE_RESEARCH_LOGIC_VERSION = "1.0.0";

export interface AudienceResearchAsset {
  id: string | null;
  userId: string;
  businessId: string;
  versionNumber: number;
  researchLogicVersion: string;
  sourceDataVersion: string;
  result: AudienceResearchResult;
  createdAt: string;
  updatedAt: string;
}

export function isAudienceAssetFresh(asset: AudienceResearchAsset, currentSourceDataVersion: string): boolean {
  return asset.researchLogicVersion === CURRENT_AUDIENCE_RESEARCH_LOGIC_VERSION
    && asset.sourceDataVersion === currentSourceDataVersion;
}

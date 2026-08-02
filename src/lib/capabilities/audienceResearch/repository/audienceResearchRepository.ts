import { AudienceResearchAsset } from "../domain/audienceResearchAsset";

export interface AudienceResearchRepository {
  findLatest(userId: string, businessId: string): Promise<AudienceResearchAsset | null>;
  findVersions(userId: string, businessId: string): Promise<AudienceResearchAsset[]>;
  save(asset: AudienceResearchAsset): Promise<AudienceResearchAsset>;
}

import { AudienceResearchRepository } from "./audienceResearchRepository";
import { AudienceResearchAsset } from "../domain/audienceResearchAsset";

export class InMemoryAudienceResearchRepository implements AudienceResearchRepository {
  private assets: AudienceResearchAsset[] = [];
  private nextId = 1;

  async findLatest(userId: string, businessId: string): Promise<AudienceResearchAsset | null> {
    const matches = this.assets.filter(a => a.userId === userId && a.businessId === businessId);
    if (matches.length === 0) return null;
    return matches.reduce((latest, a) => a.versionNumber > latest.versionNumber ? a : latest);
  }

  async findVersions(userId: string, businessId: string): Promise<AudienceResearchAsset[]> {
    return this.assets
      .filter(a => a.userId === userId && a.businessId === businessId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  async save(asset: AudienceResearchAsset): Promise<AudienceResearchAsset> {
    const saved: AudienceResearchAsset = { ...asset, id: String(this.nextId++) };
    this.assets.push(saved);
    return saved;
  }

  _clearForTesting(): void { this.assets = []; this.nextId = 1; }
}

/**
 * In-memory fake, satisfying the exact same CustomerResearchRepository
 * interface as the Supabase implementation. This is what makes
 * CustomerResearchService's real load-or-generate logic testable in this
 * sandbox — dependency injection means the service never knows or cares
 * which implementation it's talking to.
 */
import { CustomerResearchRepository } from "./customerResearchRepository";
import { CustomerResearchAsset } from "../domain/customerResearchAsset";

export class InMemoryCustomerResearchRepository implements CustomerResearchRepository {
  private assets: CustomerResearchAsset[] = [];
  private nextId = 1;

  async findLatest(userId: string, businessId: string): Promise<CustomerResearchAsset | null> {
    const matches = this.assets.filter(a => a.userId === userId && a.businessId === businessId);
    if (matches.length === 0) return null;
    return matches.reduce((latest, a) => a.versionNumber > latest.versionNumber ? a : latest);
  }

  async findVersions(userId: string, businessId: string): Promise<CustomerResearchAsset[]> {
    return this.assets
      .filter(a => a.userId === userId && a.businessId === businessId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  async save(asset: CustomerResearchAsset): Promise<CustomerResearchAsset> {
    const saved: CustomerResearchAsset = { ...asset, id: String(this.nextId++) };
    this.assets.push(saved);
    return saved;
  }

  // Test-only helpers, matching the _clearForTesting pattern already used
  // throughout this codebase (serviceContainer.ts, rateLimiter.ts).
  _clearForTesting(): void {
    this.assets = [];
    this.nextId = 1;
  }
  _getAllForTesting(): CustomerResearchAsset[] {
    return [...this.assets];
  }
}

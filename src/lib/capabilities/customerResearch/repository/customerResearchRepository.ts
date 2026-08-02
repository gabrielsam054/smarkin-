/**
 * Smarkin OS — Customer Research Repository (interface)
 *
 * Zero external dependencies, deliberately — this is what makes real
 * dependency injection possible. CustomerResearchService depends on this
 * interface, never on a concrete implementation. Production wiring injects
 * SupabaseCustomerResearchRepository; tests inject an in-memory fake. This
 * is also what makes CustomerResearchService's actual load-or-generate
 * LOGIC testable in this environment without a live Supabase connection —
 * the biggest recurring limitation across every phase of this build.
 */
import { CustomerResearchAsset } from "../domain/customerResearchAsset";

export interface CustomerResearchRepository {
  findLatest(userId: string, businessId: string): Promise<CustomerResearchAsset | null>;
  findVersions(userId: string, businessId: string): Promise<CustomerResearchAsset[]>;
  save(asset: CustomerResearchAsset): Promise<CustomerResearchAsset>;
}

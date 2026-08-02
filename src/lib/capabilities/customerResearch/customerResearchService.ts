/**
 * Smarkin OS — Customer Research Service
 *
 * Load-or-generate behavior: check the repository for a fresh asset first;
 * only run the real research pipeline (Supabase-touching, expensive) on a
 * genuine miss or staleness. Both dependencies — the repository AND the
 * generator function — are constructor-injected, real DI, not hardcoded
 * imports. This is what makes the caching DECISION logic (the actual thing
 * worth testing) verifiable in this sandbox independent of both Supabase
 * and the full research pipeline: inject an in-memory repository and a
 * trivial test generator, and every hit/miss/version-mismatch branch is
 * directly testable.
 */
import { BrainContext } from "../../brain/smarkinService";
import { CURRENT_DATA_VERSION } from "../../brain/dataVersion";
import { CustomerResearchRepository } from "./repository/customerResearchRepository";
import { CustomerResearchAsset, CURRENT_RESEARCH_LOGIC_VERSION, isAssetFresh } from "./domain/customerResearchAsset";
import { CustomerResearchInput } from "./types";
import { runResearchPipeline, ResearchPipelineOutput } from "./researchPipeline";

export type ResearchGenerator = (
  userId: string,
  input: CustomerResearchInput,
  context: BrainContext,
) => Promise<ResearchPipelineOutput>;

export class CustomerResearchService {
  constructor(
    private readonly repository: CustomerResearchRepository,
    private readonly generateResearch: ResearchGenerator = runResearchPipeline,
  ) {}

  async loadOrGenerate(
    userId: string,
    businessId: string,
    input: CustomerResearchInput,
    context: BrainContext,
    options: { forceRegenerate?: boolean } = {},
  ): Promise<CustomerResearchAsset> {
    if (!options.forceRegenerate) {
      const existing = await this.repository.findLatest(userId, businessId);
      if (existing && isAssetFresh(existing, CURRENT_DATA_VERSION)) {
        return existing;
      }
    }

    const generated = await this.generateResearch(userId, input, context);
    const previousVersions = await this.repository.findVersions(userId, businessId);
    const nextVersionNumber = previousVersions.length > 0
      ? Math.max(...previousVersions.map(v => v.versionNumber)) + 1
      : 1;

    const newAsset: CustomerResearchAsset = {
      id: null,
      userId,
      businessId,
      versionNumber: nextVersionNumber,
      researchLogicVersion: CURRENT_RESEARCH_LOGIC_VERSION,
      sourceDataVersion: generated.sourceDataVersion,
      personaNames: generated.personaNames,
      result: generated.result,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await this.repository.save(newAsset);
    if (saved.id === null) {
      // save() can still choose to return an unpersisted asset on a
      // database error (its own contract, unchanged) — but at THIS layer,
      // persistence is the actual point of the call, not a secondary
      // concern like logging. Silently returning a fake-success result
      // here is exactly what produced a confusing downstream error
      // instead of an honest one — fixed by treating this as the real
      // failure it is.
      throw new Error(`Failed to persist research for "${businessId}" — the database insert did not succeed. Check server logs for the underlying error (commonly: a pending migration hasn't been run yet).`);
    }
    return saved;
  }

  /** Used by consumers (like Advertising) that only need persona names,
   * not the full research result — still goes through the same
   * load-or-generate caching, so a second capability asking for personas
   * doesn't force a fresh, expensive regeneration. */
  async getPersonaNames(
    userId: string,
    businessId: string,
    input: CustomerResearchInput,
    context: BrainContext,
  ): Promise<string[]> {
    const asset = await this.loadOrGenerate(userId, businessId, input, context);
    return asset.personaNames;
  }
}

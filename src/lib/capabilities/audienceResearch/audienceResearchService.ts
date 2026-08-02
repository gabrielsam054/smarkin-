import { BrainContext } from "../../brain/smarkinService";
import { CURRENT_DATA_VERSION } from "../../brain/dataVersion";
import { AudienceResearchRepository } from "./repository/audienceResearchRepository";
import { AudienceResearchAsset, CURRENT_AUDIENCE_RESEARCH_LOGIC_VERSION, isAudienceAssetFresh } from "./domain/audienceResearchAsset";
import { AudienceResearchInput } from "./types";
import { runAudienceResearchPipeline, AudiencePipelineOutput } from "./researchPipeline";

export type AudienceResearchGenerator = (
  userId: string, input: AudienceResearchInput, context: BrainContext,
) => Promise<AudiencePipelineOutput>;

export class AudienceResearchService {
  constructor(
    private readonly repository: AudienceResearchRepository,
    private readonly generateResearch: AudienceResearchGenerator = runAudienceResearchPipeline,
  ) {}

  async loadOrGenerate(
    userId: string, businessId: string, input: AudienceResearchInput, context: BrainContext,
    options: { forceRegenerate?: boolean } = {},
  ): Promise<AudienceResearchAsset> {
    if (!options.forceRegenerate) {
      const existing = await this.repository.findLatest(userId, businessId);
      if (existing && isAudienceAssetFresh(existing, CURRENT_DATA_VERSION)) {
        return existing;
      }
    }

    const generated = await this.generateResearch(userId, input, context);
    const previousVersions = await this.repository.findVersions(userId, businessId);
    const nextVersionNumber = previousVersions.length > 0
      ? Math.max(...previousVersions.map(v => v.versionNumber)) + 1
      : 1;

    const newAsset: AudienceResearchAsset = {
      id: null,
      userId,
      businessId,
      versionNumber: nextVersionNumber,
      researchLogicVersion: CURRENT_AUDIENCE_RESEARCH_LOGIC_VERSION,
      sourceDataVersion: generated.sourceDataVersion,
      result: { ...generated.result, metadata: { version: nextVersionNumber, generatedAt: new Date().toISOString() } },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await this.repository.save(newAsset);
    if (saved.id === null) {
      // Same real-failure treatment already fixed for Customer Research —
      // a failed save must never masquerade as a success.
      throw new Error(`Failed to persist audience research for "${businessId}" — the database insert did not succeed.`);
    }
    return saved;
  }
}

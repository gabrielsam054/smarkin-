import { SmarkinService, BrainContext } from "../../brain/smarkinService";
import { AudienceResearchService } from "./audienceResearchService";
import { SupabaseAudienceResearchRepository } from "./repository/supabaseAudienceResearchRepository";
import { AudienceResearchInput, AudienceResearchResult } from "./types";

const defaultRepository = new SupabaseAudienceResearchRepository();
export const audienceResearchService = new AudienceResearchService(defaultRepository);

export const audienceResearchCapability: SmarkinService<AudienceResearchInput, AudienceResearchResult> = {
  serviceId: "audience-research",
  serviceType: "capability",
  version: "1.0.0",
  // Depends on business-intelligence directly (for the Registry's own
  // bookkeeping) and, functionally, on customer-research's own service —
  // that dependency is expressed by actually calling
  // customerResearchService.loadOrGenerate() inside the pipeline, not by
  // declaring it here, since Customer Research isn't a plain "engine" step
  // this capability's pipeline sequences — it's a whole other capability
  // being reused, the same way Advertising reuses Business Intelligence.
  dependsOn: ["business-intelligence"],
  optionalDependsOn: [],
  requiresBusinessIntelligence: true,
  requiresMemory: "write",

  async execute(payload: AudienceResearchInput, context: BrainContext): Promise<AudienceResearchResult> {
    const businessId = payload.product || payload.businessName;
    const asset = await audienceResearchService.loadOrGenerate(context.userId, businessId, payload, context);
    return { ...asset.result, researchId: asset.id };
  },
};

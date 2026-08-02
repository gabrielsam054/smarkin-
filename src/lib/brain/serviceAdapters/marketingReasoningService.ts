import { SmarkinService, BrainContext } from "../smarkinService";
import { analyzeMarketingReasoning, MarketingReasoningSignal } from "../../marketingReasoningEngine";

export interface MarketingReasoningInput {
  personaNames: string[];
}

export const marketingReasoningService: SmarkinService<MarketingReasoningInput, MarketingReasoningSignal> = {
  serviceId: "marketing-reasoning",
  serviceType: "engine",
  version: "1.0.0",
  dependsOn: ["business-intelligence"],
  optionalDependsOn: [],
  requiresBusinessIntelligence: true,
  requiresMemory: "none",
  async execute(input: MarketingReasoningInput, _context: BrainContext): Promise<MarketingReasoningSignal> {
    // personaNames now comes from the caller (advertisingCapability.ts),
    // sourced from the shared CustomerResearchService instead of this
    // adapter independently recomputing them via getPersonaNames() —
    // that duplication is exactly what this change removes. The actual
    // reasoning logic (analyzeMarketingReasoning) is completely unchanged.
    return analyzeMarketingReasoning(input.personaNames);
  },
};

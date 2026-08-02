import { SmarkinService, BrainContext } from "../smarkinService";
import { recommendNextAction, BusinessProfile, DecisionResult } from "../../decisionEngine";
import { MarketingReasoningSignal } from "../../marketingReasoningEngine";

export interface DecisionServiceInput {
  businessProfile: BusinessProfile;
  reasoningSignal?: MarketingReasoningSignal;
}

export const decisionService: SmarkinService<DecisionServiceInput, DecisionResult> = {
  serviceId: "decision",
  serviceType: "engine",
  version: "1.0.0",
  dependsOn: ["business-intelligence"],
  optionalDependsOn: ["marketing-reasoning"],
  requiresBusinessIntelligence: true,
  requiresMemory: "none",
  async execute(input: DecisionServiceInput, _context: BrainContext): Promise<DecisionResult> {
    return recommendNextAction(input.businessProfile, input.reasoningSignal);
  },
};

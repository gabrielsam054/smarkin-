import { SmarkinService, BrainContext } from "../smarkinService";
import { dispatchToChannelAdapter, ChannelExecutionContext } from "../../channelAdapters";
import { DecisionResult } from "../../decisionEngine";

export interface ChannelServiceInput {
  decision: DecisionResult;
  objective?: string;
  country?: string;
  existingAssets?: string;
}

export const channelService: SmarkinService<ChannelServiceInput, ChannelExecutionContext | null> = {
  serviceId: "channel",
  serviceType: "engine",
  version: "1.0.0",
  dependsOn: ["decision", "business-intelligence"],
  optionalDependsOn: [],
  requiresBusinessIntelligence: true,
  requiresMemory: "none",
  async execute(input: ChannelServiceInput, context: BrainContext): Promise<ChannelExecutionContext | null> {
    if (!context.businessIntelligence) {
      throw new Error("channel service requires Business Intelligence, but none was provided in BrainContext — pipeline ordering bug.");
    }
    return dispatchToChannelAdapter(input.decision, context.businessIntelligence, input.objective, input.country, input.existingAssets);
  },
};

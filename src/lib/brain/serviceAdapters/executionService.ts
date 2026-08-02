import { SmarkinService, BrainContext } from "../smarkinService";
import { generateExecutionBrief, ExecutionBrief } from "../../executionBriefGenerator";
import { DecisionResult } from "../../decisionEngine";
import { ChannelExecutionContext } from "../../channelAdapters";

export interface ExecutionServiceInput {
  decision: DecisionResult;
  channelExecution: ChannelExecutionContext | null;
  industry: string;
  objective?: string;
}

export const executionService: SmarkinService<ExecutionServiceInput, ExecutionBrief> = {
  serviceId: "execution",
  serviceType: "engine",
  version: "1.0.0",
  dependsOn: ["decision", "channel", "business-intelligence"],
  optionalDependsOn: [],
  requiresBusinessIntelligence: true,
  requiresMemory: "none",
  async execute(input: ExecutionServiceInput, context: BrainContext): Promise<ExecutionBrief> {
    if (!context.businessIntelligence) {
      throw new Error("execution service requires Business Intelligence, but none was provided in BrainContext — pipeline ordering bug.");
    }
    return generateExecutionBrief(input.decision, context.businessIntelligence, input.channelExecution, input.industry, input.objective);
  },
};

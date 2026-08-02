/**
 * Smarkin OS — Registration Bootstrap
 *
 * The only file that knows every service AND every capability's pipeline
 * that exists. Adding a future capability means: one registerService()
 * call for its adapter (if new), one registerService() call for the
 * capability itself, and one registerPipeline() call for its execution
 * order — all three added HERE, never inside serviceContainer.ts or
 * pipelineBuilder.ts themselves. This file is deliberately the one place
 * allowed to know specific capability names; core infrastructure
 * (Brain, Security Gateway, Message Bus, Service Container, Pipeline
 * Builder) never does.
 */
import { registerService, isServiceRegistered } from "./serviceContainer";
import { registerPipeline, isCapabilityRegistered } from "./pipelineBuilder";
import { businessIntelligenceService } from "./serviceAdapters/businessIntelligenceService";
import { marketingReasoningService } from "./serviceAdapters/marketingReasoningService";
import { decisionService } from "./serviceAdapters/decisionService";
import { channelService } from "./serviceAdapters/channelService";
import { executionService } from "./serviceAdapters/executionService";
import { advertisingCapability } from "./advertisingCapability";
import { customerResearchCapability } from "../capabilities/customerResearch/customerResearchCapability";
import { audienceResearchCapability } from "../capabilities/audienceResearch/audienceResearchCapability";

let registered = false;

export function ensureServicesRegistered(): void {
  if (registered) return;
  // Guard against double-registration in dev/hot-reload environments, where
  // this module can be re-evaluated without the process restarting.
  if (isServiceRegistered("business-intelligence") && isCapabilityRegistered("advertising") && isCapabilityRegistered("customer-research") && isCapabilityRegistered("audience-research")) {
    registered = true;
    return;
  }
  registerService(businessIntelligenceService);
  registerService(marketingReasoningService);
  registerService(decisionService);
  registerService(channelService);
  registerService(executionService);
  registerService(advertisingCapability);
  registerService(customerResearchCapability);
  registerService(audienceResearchCapability);

  registerPipeline("advertising", ["business-intelligence", "marketing-reasoning", "decision", "channel", "execution"]);
  registerPipeline("customer-research", ["business-intelligence"]);
  registerPipeline("audience-research", ["business-intelligence"]);

  registered = true;
}

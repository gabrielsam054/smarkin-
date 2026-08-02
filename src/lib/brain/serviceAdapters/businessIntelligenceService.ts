/**
 * Service adapter wrapping the untouched Business Intelligence Cache.
 * Note: the actual gatherBusinessIntelligence() call happens inside
 * getOrBuildBusinessIntelligence() (businessIntelligenceCache.ts), which this
 * adapter calls — the cache check is genuinely part of this service's job,
 * not bypassed by the adapter layer.
 */
import { SmarkinService, BrainContext } from "../smarkinService";
import { BusinessIntelligenceInput, BusinessIntelligenceProfile } from "../../businessIntelligenceEngine";
import { getOrBuildBusinessIntelligence } from "../businessIntelligenceCache";

export const businessIntelligenceService: SmarkinService<BusinessIntelligenceInput, BusinessIntelligenceProfile> = {
  serviceId: "business-intelligence",
  serviceType: "engine",
  version: "1.0.0",
  dependsOn: [],
  optionalDependsOn: [],
  requiresBusinessIntelligence: false, // this service PRODUCES it, doesn't require it
  requiresMemory: "read-write", // reads/writes the cache
  async execute(input: BusinessIntelligenceInput, context: BrainContext): Promise<BusinessIntelligenceProfile> {
    return getOrBuildBusinessIntelligence(context.userId, input, context.executionId);
  },
};

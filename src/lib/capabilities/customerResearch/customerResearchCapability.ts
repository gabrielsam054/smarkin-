/**
 * Smarkin OS — Customer Research Capability
 *
 * Refactored to a thin wrapper: the actual six-service orchestration lives
 * in researchPipeline.ts, and load-or-generate/persistence lives in
 * CustomerResearchService + its injected repository. This file's only job
 * is translating a BrainContext + payload into a service call, and
 * returning the asset's result — the same shape of responsibility
 * advertisingCapability.ts has relative to its own services.
 */
import { SmarkinService, BrainContext } from "../../brain/smarkinService";
import { CustomerResearchService } from "./customerResearchService";
import { SupabaseCustomerResearchRepository } from "./repository/supabaseCustomerResearchRepository";
import { CustomerResearchInput, CustomerResearchResult } from "./types";

const defaultRepository = new SupabaseCustomerResearchRepository();
export const customerResearchService = new CustomerResearchService(defaultRepository);

export const customerResearchCapability: SmarkinService<CustomerResearchInput, CustomerResearchResult> = {
  serviceId: "customer-research",
  serviceType: "capability",
  version: "1.0.0",
  dependsOn: ["business-intelligence"],
  optionalDependsOn: [],
  requiresBusinessIntelligence: true,
  requiresMemory: "write",

  async execute(payload: CustomerResearchInput, context: BrainContext): Promise<CustomerResearchResult> {
    const businessId = payload.product || payload.businessName;
    const asset = await customerResearchService.loadOrGenerate(context.userId, businessId, payload, context);
    return { ...asset.result, researchId: asset.id };
  },
};

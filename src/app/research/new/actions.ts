"use server";

import { redirect } from "next/navigation";
import { executeCapability } from "@/lib/smarkinBrain";
import { authProvider } from "@/lib/security/authProvider";
import { CustomerResearchInput, CustomerResearchResult } from "@/lib/capabilities/customerResearch/types";
import { log } from "@/lib/brain/diagnostics/logger";

// This is the first real caller of executeCapability<TPayload, TResult>() —
// the generic Brain entry point built specifically so a second capability
// wouldn't need its own copy of runSmarkinBrain()'s Advertising-specific
// signature. Same security path as Advertising (secureDispatch, unchanged),
// same "server action is glue, not logic" discipline as every route this
// session.
export async function createResearchRequest(
  formData: FormData,
): Promise<{ error?: string }> {
  let identity;
  try {
    identity = await authProvider.authenticate();
  } catch {
    return { error: "You must be signed in to start research." };
  }

  const businessName = String(formData.get("businessName") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const product = String(formData.get("product") ?? "").trim();
  const services = String(formData.get("services") ?? "").trim();
  const targetMarket = String(formData.get("targetMarket") ?? "").trim();
  const businessGoals = String(formData.get("businessGoals") ?? "").trim();

  if (!businessName || !industry || !product) {
    return { error: "Please fill in business name, industry, and product — the research pipeline needs these to find real customer data." };
  }

  const payload: CustomerResearchInput = {
    businessName,
    industry,
    product,
    services: services || undefined,
    targetMarket: targetMarket || undefined,
    businessGoals: businessGoals || undefined,
  };

  let result: CustomerResearchResult;
  try {
    result = await executeCapability<CustomerResearchInput, CustomerResearchResult>({
      capability: "customer-research",
      userId: identity.userId,
      productName: product,
      payload,
    });
  } catch (err) {
    log("error", "Customer Research execution failed", { userId: identity.userId, businessName, error: (err as Error).message });
    return { error: "Something went wrong generating your research. Please try again." };
  }

  if (!result.researchId) {
    // Should be unreachable now that the service throws on a failed save
    // rather than returning a fake success — kept as a real, honest
    // fallback rather than assuming the fix above covers every path.
    return { error: "Research was generated but could not be saved. Please try again." };
  }

  redirect(`/research/${result.researchId}`);
  return {};
}

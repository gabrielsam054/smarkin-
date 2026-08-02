"use server";

import { redirect } from "next/navigation";
import { executeCapability } from "@/lib/smarkinBrain";
import { authProvider } from "@/lib/security/authProvider";
import { AudienceResearchInput, AudienceResearchResult } from "@/lib/capabilities/audienceResearch/types";
import { log } from "@/lib/brain/diagnostics/logger";

export async function createAudienceResearchRequest(formData: FormData): Promise<{ error?: string }> {
  let identity;
  try {
    identity = await authProvider.authenticate();
  } catch {
    return { error: "You must be signed in to start audience research." };
  }

  const businessName = String(formData.get("businessName") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const product = String(formData.get("product") ?? "").trim();

  if (!businessName || !industry || !product) {
    return { error: "Please fill in business name, industry, and product." };
  }

  const payload: AudienceResearchInput = { businessName, industry, product };

  let result: AudienceResearchResult;
  try {
    result = await executeCapability<AudienceResearchInput, AudienceResearchResult>({
      capability: "audience-research",
      userId: identity.userId,
      productName: product,
      payload,
    });
  } catch (err) {
    log("error", "Audience Research execution failed", { userId: identity.userId, businessName, error: (err as Error).message });
    return { error: "Something went wrong generating audience research. Please try again." };
  }

  if (!result.researchId) {
    return { error: "Audience research was generated but could not be saved. Please try again." };
  }

  redirect(`/audience/${result.researchId}`);
  return {};
}

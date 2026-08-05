"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { runSmarkinBrain, SmarkinRequest, BrainRequest } from "@/lib/smarkinBrain";
import { log } from "@/lib/brain/diagnostics/logger";
import { authProvider } from "@/lib/security/authProvider";

// ─────────────────────────────────────────────────────────────────────────────
// This is the real entry point for the four-module chain built over the last
// several turns: businessIntelligenceEngine -> marketingReasoningEngine ->
// decisionEngine -> channelAdapters, all sequenced by smarkinBrain.ts.
// Nothing in this file makes a decision — it only collects input, calls the
// one function that does the reasoning, and persists the result. Same
// "server action is glue, not logic" discipline as analysis/new/actions.ts.
// ─────────────────────────────────────────────────────────────────────────────

export async function createDecisionRequest(
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  let identity;
  try {
    identity = await authProvider.authenticate();
  } catch {
    return { error: "You must be signed in to create a decision request." };
  }
  const user = { id: identity.userId };

  const productName = String(formData.get("productName") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const businessModel = String(formData.get("businessModel") ?? "").trim();
  const budgetRange = String(formData.get("budgetRange") ?? "").trim();
  const weeklyHours = String(formData.get("weeklyHours") ?? "").trim();
  const teamSize = String(formData.get("teamSize") ?? "").trim();
  const marketingExperience = String(formData.get("marketingExperience") ?? "").trim();
  const existingAssets = String(formData.get("existingAssets") ?? "").trim();
  const businessStage = String(formData.get("businessStage") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();

  if (!productName || !industry || !budgetRange || !weeklyHours || !businessStage || !goal) {
    return { error: "Please fill in product, industry, budget, weekly hours, business stage, and goal — these are required for the Decision Engine to reason correctly." };
  }

  // ── Save the request first, same pattern as analysis_requests ─────────────
  const { data: request, error: requestError } = await supabase
    .from("decision_requests")
    .insert({
      user_id: user.id,
      // Closes a real gap: product_name was computed and used for the
      // reasoning call below but never actually saved to this table —
      // meaning there was no way to connect a decision back to its
      // business_intelligence_profiles row afterward, and therefore no
      // way to show real linked campaign data on the decision.
      product_name: productName,
      industry,
      business_model: businessModel || "B2C",
      product_type: String(formData.get("productType") ?? "") || null,
      budget_range: budgetRange,
      weekly_hours: weeklyHours,
      team_size: teamSize || "Solo",
      marketing_experience: marketingExperience || "Beginner",
      existing_assets: existingAssets || "None",
      customer_awareness: String(formData.get("customerAwareness") ?? "") || null,
      business_stage: businessStage,
      goal,
      status: "processing",
    })
    .select()
    .single();

  if (requestError || !request) {
    return { error: `Could not save your request: ${requestError?.message ?? "unknown error"}` };
  }

  // ── Run the real chain — this is the entire reasoning system built this session ──
  const smarkinRequest: SmarkinRequest = {
    productName,
    description: String(formData.get("description") ?? "") || undefined,
    businessType: businessModel === "B2B" ? "B2B" : "Ecommerce",
    industry,
    businessModel: businessModel || "B2C",
    productType: String(formData.get("productType") ?? "") || undefined,
    budgetRange,
    weeklyHours,
    teamSize: teamSize || "Solo",
    marketingExperience: marketingExperience || "Beginner",
    existingAssets: existingAssets || "None",
    customerAwareness: String(formData.get("customerAwareness") ?? "") || undefined,
    businessStage,
    goal,
    objective: goal,
    country: String(formData.get("country") ?? "") || "Worldwide",
  };

  // BrainRequest wraps the existing payload — capability defaults to
  // "advertising" server-side if omitted, but stated explicitly here since
  // this route only ever means one thing.
  const brainRequest: BrainRequest<SmarkinRequest> = {
    capability: "advertising",
    userId: user.id,
    productName,
    description: smarkinRequest.description,
    businessType: smarkinRequest.businessType,
    payload: smarkinRequest,
  };

  let result;
  try {
    result = await runSmarkinBrain(brainRequest);
  } catch (err) {
    await supabase.from("decision_requests").update({ status: "failed" }).eq("id", request.id);
    log("error", "Smarkin Brain failed", { userId: user.id, productName, error: (err as Error).message });
    return { error: "Something went wrong generating your recommendation. Please try again." };
  }

  // ── Save the result — every layer's gaps preserved, nothing silently dropped ──
  const { error: resultError } = await supabase.from("decision_results").insert({
    request_id: request.id,
    user_id: user.id,
    matched_archetype_id: result.decision.matchedArchetype?.ruleId ?? null,
    matched_archetype_industry: result.decision.matchedArchetype?.industry ?? null,
    match_score: result.decision.matchedArchetype?.matchScore ?? 0,
    channel_scores: result.decision.channelScores,
    recommended_channel: result.decision.recommendedChannel,
    second_channel: result.decision.secondChannel,
    third_channel: result.decision.thirdChannel,
    channel_reasoning: result.decision.channelReasoning,
    channel_evidence: result.decision.channelEvidence,
    channel_confidence: result.decision.channelConfidence,
    primary_recommendation: result.decision.primaryRecommendation,
    alternative_actions: result.decision.alternativeActions,
    critical_opportunities: result.decision.criticalOpportunities,
    channel_execution: result.channelExecution,
    execution_brief: result.executionBrief,
    execution_id: result.executionId,
    gaps: result.allGaps,
  });

  if (resultError) {
    await supabase.from("decision_requests").update({ status: "failed" }).eq("id", request.id);
    return { error: `Recommendation generated but could not be saved: ${resultError.message}` };
  }

  await supabase.from("decision_requests").update({ status: "completed" }).eq("id", request.id);

  redirect(`/decision/${request.id}`);
  return {};
}

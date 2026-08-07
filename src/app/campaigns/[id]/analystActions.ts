"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Closes the real Learning gap for Campaign Intelligence. Mirrors
 * reportDecisionOutcome's exact, already-proven pattern rather than
 * inventing a new one.
 */
export async function reportCampaignRecommendationOutcome(
  recommendationId: string,
  outcome: "worked" | "did_not_work" | "too_early_to_tell",
  notes?: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to report an outcome." };

  const { error } = await supabase.from("campaign_analyst_outcomes").insert({
    recommendation_id: recommendationId,
    user_id: user.id,
    outcome,
    notes: notes || null,
  });

  if (error) return { error: `Could not save your feedback: ${error.message}` };
  return {};
}

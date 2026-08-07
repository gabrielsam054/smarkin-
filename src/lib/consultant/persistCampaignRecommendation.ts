import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Real persistence for the Campaign Intelligence Learning gap the
 * Intelligence Maturity Model surfaced - shared by both real places a
 * campaign-specific Analyst response gets generated (the Campaign
 * Detail page's direct route, and the sidebar consultant's
 * campaign_specific routing) so neither path silently misses
 * recording what it recommended.
 *
 * A write failure here must never break the actual response the user
 * is waiting on - same read/write-failure isolation pattern already
 * proven in businessIntelligenceCache.ts.
 */
export async function persistCampaignRecommendation(
  supabase: SupabaseClient,
  userId: string,
  campaignEntityId: string,
  question: string,
  recommendations: unknown,
  routedVia: "campaign detail page" | "sidebar consultant",
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("campaign_analyst_recommendations")
      .insert({ campaign_entity_id: campaignEntityId, user_id: userId, question, recommendations, routed_via: routedVia })
      .select("id")
      .single();
    if (error) {
      console.error("[persistCampaignRecommendation] Failed to persist:", error.message);
      return null;
    }
    return data.id;
  } catch (e) {
    console.error("[persistCampaignRecommendation] Exception:", e);
    return null;
  }
}

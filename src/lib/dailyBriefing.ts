import { SupabaseClient } from "@supabase/supabase-js";
import { computeCampaignHealth } from "@/lib/connectors/campaignHealth";

export interface DailyBriefing {
  hasConnectedAccount: boolean;
  openOpportunityCount: number;
  criticalCount: number; // zero_recent_activity specifically
  topPriorities: Array<{ title: string; confidence: string; campaignExternalId: string }>;
  campaignsImproving: number;
  campaignsDeclining: number;
}

/**
 * Real synthesis of real data — genuine counts of real opportunities
 * and real health trend directions, computed fresh each time. No
 * fabricated "estimated upside" percentage, unlike the example in the
 * prompt this was built from ("+18% conversions") — that would require
 * predictive modeling this system doesn't have, exactly the same
 * reasoning that kept Opportunities from inventing a dollar-impact
 * number. This tells you real counts and real findings; it doesn't
 * promise an outcome no engine here can actually compute.
 */
export async function buildDailyBriefing(supabase: SupabaseClient, workspaceId: string): Promise<DailyBriefing> {
  const { data: accounts } = await supabase
    .from("platform_accounts").select("id").eq("workspace_id", workspaceId).eq("status", "active");

  if (!accounts || accounts.length === 0) {
    return { hasConnectedAccount: false, openOpportunityCount: 0, criticalCount: 0, topPriorities: [], campaignsImproving: 0, campaignsDeclining: 0 };
  }

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("title, opportunity_type, confidence, related_campaign_external_id")
    .eq("workspace_id", workspaceId).eq("status", "open");

  const opps = opportunities ?? [];
  const criticalCount = opps.filter((o) => o.opportunity_type === "zero_recent_activity").length;

  const confidenceRank = { high: 0, medium: 1, low: 2 };
  const topPriorities = opps
    .slice()
    .sort((a, b) => confidenceRank[a.confidence as keyof typeof confidenceRank] - confidenceRank[b.confidence as keyof typeof confidenceRank])
    .slice(0, 3)
    .map((o) => ({ title: o.title, confidence: o.confidence, campaignExternalId: o.related_campaign_external_id }));

  // Real health direction across every campaign — genuine counts of
  // how many campaigns' CTR trend is actually improving vs declining,
  // not a single invented "account health" number.
  const { data: campaignRows } = await supabase
    .from("campaign_entities").select("external_id")
    .in("platform_account_id", accounts.map((a) => a.id)).eq("kind", "campaign");

  let campaignsImproving = 0;
  let campaignsDeclining = 0;
  if (campaignRows && campaignRows.length > 0) {
    const { data: dailySnapshots } = await supabase
      .from("metric_snapshots").select("entity_id, metric_key, value, captured_at")
      .eq("workspace_id", workspaceId).eq("source_window", "daily")
      .in("entity_id", campaignRows.map((c) => c.external_id))
      .gte("captured_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    for (const c of campaignRows) {
      const health = computeCampaignHealth((dailySnapshots ?? []).filter((s) => s.entity_id === c.external_id));
      if (health.ctr.direction === "improving") campaignsImproving++;
      if (health.ctr.direction === "declining") campaignsDeclining++;
    }
  }

  return { hasConnectedAccount: true, openOpportunityCount: opps.length, criticalCount, topPriorities, campaignsImproving, campaignsDeclining };
}

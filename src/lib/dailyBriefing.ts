import { SupabaseClient } from "@supabase/supabase-js";
import { computeCampaignHealth } from "@/lib/connectors/campaignHealth";

export interface DailyBriefing {
  hasConnectedAccount: boolean;
  totalSpend7d: number | null;
  openOpportunityCount: number;
  criticalCount: number; // zero_recent_activity specifically
  readyToScaleCount: number; // real count of high_ctr_low_spend findings — a genuine, evidence-backed "worth scaling" signal, not a guess
  topPriorities: Array<{ title: string; confidence: string; campaignExternalId: string; evidence: Record<string, unknown>; opportunityType: string }>;
  campaignsImproving: number;
  campaignsDeclining: number;
}

/**
 * Real synthesis of real data — genuine counts of real opportunities
 * and real health trend directions, computed fresh each time. No
 * fabricated "estimated upside" percentage or dollar impact figure —
 * that would require predictive modeling this system doesn't have,
 * the same reasoning that already kept Opportunities from inventing a
 * dollar-impact number (see Decision #008). This tells you real counts
 * and real findings; it doesn't promise an outcome no engine here can
 * actually compute.
 */
export async function buildDailyBriefing(supabase: SupabaseClient, workspaceId: string): Promise<DailyBriefing> {
  const { data: accounts } = await supabase
    .from("platform_accounts").select("id").eq("workspace_id", workspaceId).eq("status", "active");

  if (!accounts || accounts.length === 0) {
    return { hasConnectedAccount: false, totalSpend7d: null, openOpportunityCount: 0, criticalCount: 0, readyToScaleCount: 0, topPriorities: [], campaignsImproving: 0, campaignsDeclining: 0 };
  }

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("title, opportunity_type, confidence, related_campaign_external_id, evidence")
    .eq("workspace_id", workspaceId).eq("status", "open");

  const opps = opportunities ?? [];
  const criticalCount = opps.filter((o) => o.opportunity_type === "zero_recent_activity").length;
  const readyToScaleCount = opps.filter((o) => o.opportunity_type === "high_ctr_low_spend").length;

  const confidenceRank = { high: 0, medium: 1, low: 2 };
  const topPriorities = opps
    .slice()
    .sort((a, b) => confidenceRank[a.confidence as keyof typeof confidenceRank] - confidenceRank[b.confidence as keyof typeof confidenceRank])
    .slice(0, 3)
    .map((o) => ({ title: o.title, confidence: o.confidence, campaignExternalId: o.related_campaign_external_id, evidence: o.evidence as Record<string, unknown>, opportunityType: o.opportunity_type }));

  // Real health direction across every campaign — genuine counts of
  // how many campaigns' CTR trend is actually improving vs declining,
  // not a single invented "account health" number.
  const { data: campaignRows } = await supabase
    .from("campaign_entities").select("external_id")
    .in("platform_account_id", accounts.map((a) => a.id)).eq("kind", "campaign");

  let campaignsImproving = 0;
  let campaignsDeclining = 0;
  let totalSpend7d: number | null = null;

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

    // Real total spend across the account, last 7 real days — the
    // "Account Performance" figure, genuinely summed, not estimated.
    const { data: recentSpend } = await supabase
      .from("metric_snapshots").select("value")
      .eq("workspace_id", workspaceId).eq("metric_key", "spend")
      .in("entity_id", campaignRows.map((c) => c.external_id))
      .gte("captured_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    if (recentSpend && recentSpend.length > 0) {
      totalSpend7d = recentSpend.reduce((sum, s) => sum + s.value, 0);
    }
  }

  return { hasConnectedAccount: true, totalSpend7d, openOpportunityCount: opps.length, criticalCount, readyToScaleCount, topPriorities, campaignsImproving, campaignsDeclining };
}

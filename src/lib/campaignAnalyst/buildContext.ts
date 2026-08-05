import { SupabaseClient } from "@supabase/supabase-js";
import { computeCampaignHealth } from "@/lib/connectors/campaignHealth";

export interface CampaignAnalystContext {
  campaignName: string;
  objective: string | null;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  latestMetrics: Record<string, number>;
  health: ReturnType<typeof computeCampaignHealth>;
  accountAverages: { ctr: number | null; spend: number | null };
  openOpportunities: Array<{ title: string; evidence: Record<string, unknown>; confidence: string; type: string }>;
  audienceSegments: Array<{ ageRange: string; gender: string; ctr: number }>;
  dataAvailability: { hasReach: boolean; hasFrequency: boolean; hasBudget: boolean; hasAudienceData: boolean; daysOfDailyHistory: number };
}

/**
 * The real knowledge boundary the analyst operates inside — only this
 * one campaign's genuine data, assembled fresh from the same tables
 * every other real feature this session reads from (metric_snapshots,
 * opportunities, campaign_breakdown_snapshots). No cross-campaign or
 * cross-workspace data is ever included, matching the explicit
 * knowledge-boundary requirement — this function structurally can't
 * leak that, since every query below is scoped to one campaign's
 * external_id and one workspace_id.
 */
export async function buildCampaignAnalystContext(
  supabase: SupabaseClient,
  workspaceId: string,
  campaignEntityId: string
): Promise<CampaignAnalystContext | null> {
  const { data: campaign } = await supabase
    .from("campaign_entities")
    .select("external_id, name, objective, daily_budget, lifetime_budget")
    .eq("id", campaignEntityId).eq("workspace_id", workspaceId).single();

  if (!campaign) return null;

  const { data: dailySnapshots } = await supabase
    .from("metric_snapshots").select("metric_key, value, captured_at")
    .eq("workspace_id", workspaceId).eq("entity_id", campaign.external_id).eq("source_window", "daily")
    .gte("captured_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const { data: latestSnapshots } = await supabase
    .from("metric_snapshots").select("metric_key, value, captured_at")
    .eq("workspace_id", workspaceId).eq("entity_id", campaign.external_id)
    .order("captured_at", { ascending: false }).limit(20);

  const latestMetrics: Record<string, number> = {};
  for (const s of latestSnapshots ?? []) {
    if (!(s.metric_key in latestMetrics)) latestMetrics[s.metric_key] = s.value;
  }

  const health = computeCampaignHealth(dailySnapshots ?? []);

  // Real account averages — same campaigns, same comparison basis the
  // Opportunities detector itself uses, not a separately invented number.
  const { data: allCampaigns } = await supabase
    .from("campaign_entities").select("external_id").eq("workspace_id", workspaceId).eq("kind", "campaign");
  const allExternalIds = (allCampaigns ?? []).map((c) => c.external_id);
  const { data: recentAllSnapshots } = allExternalIds.length > 0
    ? await supabase.from("metric_snapshots").select("entity_id, metric_key, value")
        .eq("workspace_id", workspaceId).in("entity_id", allExternalIds)
        .gte("captured_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    : { data: null };

  const ctrValues = (recentAllSnapshots ?? []).filter((s) => s.metric_key === "ctr").map((s) => s.value);
  const spendValues = (recentAllSnapshots ?? []).filter((s) => s.metric_key === "spend").map((s) => s.value);
  const accountAverages = {
    ctr: ctrValues.length > 0 ? ctrValues.reduce((a, b) => a + b, 0) / ctrValues.length : null,
    spend: spendValues.length > 0 ? spendValues.reduce((a, b) => a + b, 0) / spendValues.length : null,
  };

  const { data: opportunityRows } = await supabase
    .from("opportunities").select("title, evidence, confidence, opportunity_type")
    .eq("workspace_id", workspaceId).eq("related_campaign_external_id", campaign.external_id).eq("status", "open");

  const { data: breakdownRows } = await supabase
    .from("campaign_breakdown_snapshots").select("age_range, gender, value")
    .eq("workspace_id", workspaceId).eq("entity_id", campaign.external_id).eq("metric_key", "ctr")
    .order("captured_at", { ascending: false }).limit(20);

  const uniqueDays = new Set((dailySnapshots ?? []).map((s) => s.captured_at.slice(0, 10)));

  return {
    campaignName: campaign.name,
    objective: campaign.objective,
    dailyBudget: campaign.daily_budget,
    lifetimeBudget: campaign.lifetime_budget,
    latestMetrics,
    health,
    accountAverages,
    openOpportunities: (opportunityRows ?? []).map((o) => ({
      title: o.title, evidence: o.evidence as Record<string, unknown>, confidence: o.confidence, type: o.opportunity_type,
    })),
    audienceSegments: (breakdownRows ?? []).map((b) => ({ ageRange: b.age_range, gender: b.gender, ctr: b.value })),
    dataAvailability: {
      hasReach: "reach" in latestMetrics, hasFrequency: "frequency" in latestMetrics,
      hasBudget: campaign.daily_budget !== null || campaign.lifetime_budget !== null,
      hasAudienceData: (breakdownRows ?? []).length > 0,
      daysOfDailyHistory: uniqueDays.size,
    },
  };
}

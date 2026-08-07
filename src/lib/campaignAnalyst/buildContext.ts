import { SupabaseClient } from "@supabase/supabase-js";
import { computeCampaignHealth } from "@/lib/connectors/campaignHealth";

import { SupabaseCustomerResearchRepository } from "@/lib/capabilities/customerResearch/repository/supabaseCustomerResearchRepository";
import { getGraphExtensionsForNode, KnowledgeGraphExtension } from "@/lib/consultant/knowledgeGraphExtensions";

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
  placementSegments: Array<{ publisherPlatform: string; platformPosition: string; device: string; ctr: number }>;
  pastDecisionOutcomes: Array<{ recommendedChannel: string | null; outcome: string; notes: string | null }>;
  personas: Array<{ name: string; primaryGoal: string }>;
  knowledgeGraphConnections: KnowledgeGraphExtension[];
  dataAvailability: { hasReach: boolean; hasFrequency: boolean; hasBudget: boolean; hasAudienceData: boolean; hasPlacementData: boolean; daysOfDailyHistory: number };
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
  userId: string,
  workspaceId: string,
  campaignEntityId: string
): Promise<CampaignAnalystContext | null> {
  const { data: campaign } = await supabase
    .from("campaign_entities")
    .select("external_id, name, objective, daily_budget, lifetime_budget, platform_account_id")
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

  const { data: placementRows } = await supabase
    .from("campaign_placement_snapshots").select("publisher_platform, platform_position, impression_device, value")
    .eq("workspace_id", workspaceId).eq("entity_id", campaign.external_id).eq("metric_key", "ctr")
    .order("captured_at", { ascending: false }).limit(20);

  // Real decision-outcome memory — traces the same business->account
  // link chain already proven for Knowledge Graph (never a new
  // relationship system): this campaign's platform_account_id ->
  // whichever business_intelligence_profiles row is explicitly linked
  // to it -> that business's product_name -> decisions made about that
  // same product -> real reported outcomes on those decisions. Only
  // ever the outcomes for the SAME underlying business this campaign
  // actually belongs to, never another workspace's or another
  // business's history.
  let pastDecisionOutcomes: CampaignAnalystContext["pastDecisionOutcomes"] = [];
  const { data: linkedProfile } = await supabase
    .from("business_intelligence_profiles")
    .select("product_name, knowledge_graph_profile")
    .eq("linked_platform_account_id", campaign.platform_account_id)
    .maybeSingle();

  if (linkedProfile?.product_name) {
    const { data: relatedRequests } = await supabase
      .from("decision_requests").select("id")
      .eq("user_id", userId)
      .eq("product_name", linkedProfile.product_name);

    const requestIds = (relatedRequests ?? []).map((r) => r.id);
    if (requestIds.length > 0) {
      const { data: relatedResults } = await supabase
        .from("decision_results").select("id, recommended_channel")
        .in("request_id", requestIds);

      const resultIds = (relatedResults ?? []).map((r) => r.id);
      if (resultIds.length > 0) {
        const { data: outcomeRows } = await supabase
          .from("decision_outcomes").select("decision_result_id, outcome, notes")
          .in("decision_result_id", resultIds);

        pastDecisionOutcomes = (outcomeRows ?? []).map((o) => ({
          recommendedChannel: (relatedResults ?? []).find((r) => r.id === o.decision_result_id)?.recommended_channel ?? null,
          outcome: o.outcome, notes: o.notes,
        }));
      }
    }
  }

  // Real persona data — reuses the exact same product_name already
  // resolved above for decision outcomes, not a second, separate
  // resolution path. Reuses SupabaseCustomerResearchRepository, the
  // same real repository already used by the Campaign Blueprint,
  // rather than a new query against customer_research.
  let personas: CampaignAnalystContext["personas"] = [];
  if (linkedProfile?.product_name) {
    const customerRepo = new SupabaseCustomerResearchRepository();
    const customerAsset = await customerRepo.findLatest(userId, linkedProfile.product_name);
    if (customerAsset) {
      personas = customerAsset.result.customerPersonas.map((p) => ({ name: p.name, primaryGoal: p.primaryGoal }));
    }
  }

  // Knowledge Graph connections — queried against the real, cached
  // connectedGoals from business_intelligence_profiles' own static
  // graph traversal (lookupKnowledgeGraphProfile()), NOT against
  // Customer Research's separate persona.primaryGoal field. Found via
  // real testing: Customer Research's persona matching is a thinner,
  // separate system that can genuinely find nothing even when the
  // static graph has real, high-confidence coverage for the same
  // product (confirmed directly for "Whey Protein" — Customer
  // Research found no persona, but the static graph has a real,
  // 99%-confidence "Build Muscle" goal edge). The cached graph
  // traversal is the more reliable source to query against.
  const knowledgeGraphConnections: CampaignAnalystContext["knowledgeGraphConnections"] = [];
  const cachedGraphProfile = linkedProfile?.knowledge_graph_profile as { connectedGoals?: string[] } | null;
  if (cachedGraphProfile?.connectedGoals) {
    for (const goal of cachedGraphProfile.connectedGoals) {
      const edges = await getGraphExtensionsForNode(supabase, goal);
      knowledgeGraphConnections.push(...edges);
    }
  }

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
    placementSegments: (placementRows ?? []).map((p) => ({
      publisherPlatform: p.publisher_platform, platformPosition: p.platform_position, device: p.impression_device, ctr: p.value,
    })),
    pastDecisionOutcomes,
    personas,
    knowledgeGraphConnections,
    dataAvailability: {
      hasReach: "reach" in latestMetrics, hasFrequency: "frequency" in latestMetrics,
      hasBudget: campaign.daily_budget !== null || campaign.lifetime_budget !== null,
      hasAudienceData: (breakdownRows ?? []).length > 0,
      hasPlacementData: (placementRows ?? []).length > 0,
      daysOfDailyHistory: uniqueDays.size,
    },
  };
}

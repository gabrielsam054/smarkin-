import { SupabaseClient } from "@supabase/supabase-js";
import { computeCampaignHealth } from "@/lib/connectors/campaignHealth";
import { getAllPrinciples, MarketingPrinciple } from "./marketingPrinciples";
import { getPlaybookByName, MarketingPlaybook } from "./marketingPlaybooks";

export interface DiagnosisContext {
  hasConnectedAccount: boolean;
  decliningCampaigns: Array<{ name: string; ctrChangePercent: number | null }>;
  problemFindings: Array<{ title: string; confidence: string; evidence: Record<string, unknown> }>;
  relevantPrinciples: MarketingPrinciple[];
  playbook: MarketingPlaybook | null;
}

// The real, disclosed subset of opportunity types that represent an
// actual problem to diagnose, not a positive finding — a campaign
// outperforming its own average is real, but it's not what "why is my
// ROAS dropping" is asking about.
const PROBLEM_OPPORTUNITY_TYPES = ["high_spend_low_ctr", "zero_recent_activity", "high_ctr_low_conversion"];

/**
 * Real context for the "campaign_diagnosis" intent — a genuinely
 * different question shape than the account summary. Reuses the same
 * real health-trend computation and the same opportunities table, but
 * filters specifically to what's actually struggling, since that's
 * what a "why is X dropping" question needs, not a full survey of
 * everything including good news.
 */
export async function buildDiagnosisContext(supabase: SupabaseClient, workspaceId: string): Promise<DiagnosisContext> {
  const { data: accounts } = await supabase
    .from("platform_accounts").select("id").eq("workspace_id", workspaceId).eq("status", "active");

  if (!accounts || accounts.length === 0) {
    return { hasConnectedAccount: false, decliningCampaigns: [], problemFindings: [], relevantPrinciples: [], playbook: null };
  }

  const { data: campaignRows } = await supabase
    .from("campaign_entities").select("id, external_id, name")
    .in("platform_account_id", accounts.map((a) => a.id)).eq("kind", "campaign");

  const decliningCampaigns: DiagnosisContext["decliningCampaigns"] = [];
  if (campaignRows && campaignRows.length > 0) {
    const { data: dailySnapshots } = await supabase
      .from("metric_snapshots").select("entity_id, metric_key, value, captured_at")
      .eq("workspace_id", workspaceId).eq("source_window", "daily")
      .in("entity_id", campaignRows.map((c) => c.external_id))
      .gte("captured_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    for (const c of campaignRows) {
      const health = computeCampaignHealth((dailySnapshots ?? []).filter((s) => s.entity_id === c.external_id));
      if (health.ctr.direction === "declining") {
        decliningCampaigns.push({ name: c.name, ctrChangePercent: health.ctr.changePercent });
      }
    }
  }

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("title, opportunity_type, confidence, evidence")
    .eq("workspace_id", workspaceId).eq("status", "open")
    .in("opportunity_type", PROBLEM_OPPORTUNITY_TYPES);

  const relevantPrinciples = await getAllPrinciples(supabase);
  const playbook = await getPlaybookByName(supabase, "Recover Poor Campaign");

  return {
    hasConnectedAccount: true,
    decliningCampaigns,
    problemFindings: (opportunities ?? []).map((o) => ({ title: o.title, confidence: o.confidence, evidence: o.evidence as Record<string, unknown> })),
    relevantPrinciples,
    playbook,
  };
}

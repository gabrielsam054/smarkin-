import { SupabaseClient } from "@supabase/supabase-js";
import { resolveLatestMetrics } from "./resolveLatestMetrics";

/**
 * The first genuine Intelligence engine — not schema-only. Deliberately
 * scoped to what's honestly computable from real campaign_entities +
 * metric_snapshots data, comparing each campaign against the account's
 * own real average rather than an external benchmark that would be
 * fabricated (no industry-benchmark data source exists in this system).
 *
 * Deliberately does NOT estimate a dollar "expected impact" — that
 * would require predictive modeling this system doesn't have real
 * infrastructure for yet, and a fabricated number would be worse than
 * none. Ranked instead by confidence (real, tied to how many campaigns
 * exist to compare against) and deviation magnitude (a real, computable
 * proxy for "how unusual is this finding for this specific account").
 */
export async function detectOpportunities(
  supabase: SupabaseClient,
  platformAccountId: string
): Promise<void> {
  const { data: accountRow } = await supabase
    .from("platform_accounts")
    .select("workspace_id")
    .eq("id", platformAccountId)
    .maybeSingle();

  if (!accountRow?.workspace_id) return;
  const workspaceId = accountRow.workspace_id;

  const { data: campaignRows } = await supabase
    .from("campaign_entities")
    .select("id, external_id, name, synced_at")
    .eq("platform_account_id", platformAccountId)
    .eq("kind", "campaign");

  if (!campaignRows || campaignRows.length === 0) return;

  const externalIds = campaignRows.map((c) => c.external_id);
  const { data: snapshotRows } = await supabase
    .from("metric_snapshots")
    .select("entity_id, metric_key, value, captured_at")
    .eq("workspace_id", workspaceId)
    .in("entity_id", externalIds)
    .gte("captured_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const resolved = resolveLatestMetrics(campaignRows, snapshotRows ?? []);
  const withData = resolved.filter((c) => c.metrics.ctr !== null && c.metrics.spend !== null);

  // Real confidence, tied to real data volume — not fabricated. Fewer
  // peer campaigns means "average" means less; said plainly via the
  // stored confidence level, not hidden.
  const confidence: "low" | "medium" | "high" =
    withData.length >= 6 ? "high" : withData.length >= 3 ? "medium" : "low";

  if (withData.length < 2) return; // genuinely not enough campaigns to compare against at all

  const avgCtr = withData.reduce((s, c) => s + (c.metrics.ctr ?? 0), 0) / withData.length;
  const avgSpend = withData.reduce((s, c) => s + (c.metrics.spend ?? 0), 0) / withData.length;

  const opportunities: Array<{
    related_campaign_external_id: string; opportunity_type: string; title: string;
    evidence: Record<string, unknown>; confidence: string;
  }> = [];

  for (const c of resolved) {
    if (c.metrics.impressions === 0) {
      opportunities.push({
        related_campaign_external_id: c.externalId,
        opportunity_type: "zero_recent_activity",
        title: `"${c.name}" has had zero impressions in the last 7 days`,
        evidence: { impressions_7d: 0, campaign_name: c.name },
        confidence: "high", // this one doesn't depend on peer comparison — zero is zero
      });
      continue;
    }

    if (c.metrics.ctr === null || c.metrics.spend === null) continue;

    if (c.metrics.ctr > avgCtr * 1.5 && c.metrics.spend < avgSpend * 0.5) {
      opportunities.push({
        related_campaign_external_id: c.externalId,
        opportunity_type: "high_ctr_low_spend",
        title: `"${c.name}" is outperforming your account average CTR with relatively low spend`,
        evidence: {
          campaign_ctr: Number(c.metrics.ctr.toFixed(2)), account_avg_ctr: Number(avgCtr.toFixed(2)),
          campaign_spend: Number(c.metrics.spend.toFixed(2)), account_avg_spend: Number(avgSpend.toFixed(2)),
        },
        confidence,
      });
    } else if (c.metrics.spend > avgSpend * 1.5 && c.metrics.ctr < avgCtr * 0.5) {
      opportunities.push({
        related_campaign_external_id: c.externalId,
        opportunity_type: "high_spend_low_ctr",
        title: `"${c.name}" is spending above your account average with below-average CTR`,
        evidence: {
          campaign_ctr: Number(c.metrics.ctr.toFixed(2)), account_avg_ctr: Number(avgCtr.toFixed(2)),
          campaign_spend: Number(c.metrics.spend.toFixed(2)), account_avg_spend: Number(avgSpend.toFixed(2)),
        },
        confidence,
      });
    }
  }

  if (opportunities.length === 0) return;

  // Upsert on the real unique constraint — re-running detection
  // updates existing open opportunities with fresh evidence rather
  // than creating duplicates every sync cycle.
  const { error } = await supabase.from("opportunities").upsert(
    opportunities.map((o) => ({ ...o, workspace_id: workspaceId, platform_account_id: platformAccountId, status: "open" })),
    { onConflict: "platform_account_id,related_campaign_external_id,opportunity_type" }
  );

  if (error) {
    console.error(`[opportunities] failed to write detected opportunities for ${platformAccountId}:`, error.message);
  }
}

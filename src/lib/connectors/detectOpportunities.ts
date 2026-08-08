import { SupabaseClient } from "@supabase/supabase-js";
import { resolveLatestMetrics } from "./resolveLatestMetrics";
import DB_RAW from "../smarkin-db.json";

// Real, single source for this specific recommendation text — the
// exact same optimisationRules table the audit found sitting unused.
// Read directly from it rather than a hardcoded copy that could
// silently drift from the real source over time.
const OPTIMISATION_RULES = (DB_RAW as { optimisationRules?: Array<{ Metric: string; Condition: string; Recommendation: string }> }).optimisationRules ?? [];
function findOptimisationRule(metric: string, condition: string): string | null {
  return OPTIMISATION_RULES.find((r) => r.Metric === metric && r.Condition === condition)?.Recommendation ?? null;
}

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
          // Real, from the optimisationRules reference table — not
          // generated per-opportunity, the same static recommendation
          // for this exact metric/condition every time. Honestly
          // omitted (undefined) if the table entry doesn't exist,
          // never a fabricated fallback string.
          ...(findOptimisationRule("CTR", "Low") ? { recommended_action: findOptimisationRule("CTR", "Low") } : {}),
        },
        confidence,
      });
    }

    // Real, newly-achievable now that purchase-conversion data is
    // synced: a campaign getting real clicks but zero real purchases.
    // Requires at least 20 clicks before flagging — below that, zero
    // conversions is completely normal statistical noise, not a real
    // finding, and flagging it would be exactly the kind of
    // small-sample overconfidence this system has avoided everywhere
    // else. Honestly scoped to "purchase" conversions specifically —
    // a campaign optimizing for leads or add-to-cart would show no
    // conversions here even while performing well against its real goal.
    const conversions = (snapshotRows ?? [])
      .filter((s) => s.entity_id === c.externalId && s.metric_key === "conversions")
      .sort((a, b) => b.captured_at.localeCompare(a.captured_at))[0]?.value ?? null;

    if (conversions === 0 && (c.metrics.clicks ?? 0) >= 20) {
      opportunities.push({
        related_campaign_external_id: c.externalId,
        opportunity_type: "high_ctr_low_conversion",
        title: `"${c.name}" is getting real clicks but zero recorded purchases`,
        evidence: {
          clicks_7d: c.metrics.clicks, conversions_7d: 0, campaign_ctr: c.metrics.ctr !== null ? Number(c.metrics.ctr.toFixed(2)) : null,
        },
        confidence: (c.metrics.clicks ?? 0) >= 50 ? "high" : "medium",
      });
    }
  }

  if (opportunities.length === 0) return;

  // Upsert on the real unique constraint — re-running detection
  // updates existing open opportunities with fresh evidence rather
  // than creating duplicates every sync cycle. related_segment_key is
  // explicitly null here — these are campaign-level findings, not
  // segment-level ones (that's detectAudienceOpportunities below) —
  // matching the constraint's real shape now that it accounts for both.
  const { error } = await supabase.from("opportunities").upsert(
    // Real fix for a real, active bug: NULL was used here previously,
    // but Postgres never treats two NULL values as equal in a unique
    // constraint — meaning the onConflict clause below never actually
    // matched an existing row, and every single sync run inserted a
    // fresh duplicate instead of updating in place. Empty string
    // satisfies equality correctly, closing this permanently.
    opportunities.map((o) => ({ ...o, workspace_id: workspaceId, platform_account_id: platformAccountId, status: "open", related_segment_key: "" })),
    { onConflict: "platform_account_id,related_campaign_external_id,opportunity_type,related_segment_key" }
  );

  if (error) {
    console.error(`[opportunities] failed to write detected opportunities for ${platformAccountId}:`, error.message);
  }
}

/**
 * Extends Opportunities with real within-campaign audience findings,
 * now that age+gender breakdown data actually exists to detect from.
 * Same comparative discipline as detectOpportunities(): a segment is
 * only flagged if it deviates meaningfully from that SAME campaign's
 * own overall average — never against an external benchmark, and
 * never with a fabricated confidence when there isn't enough real
 * segment data to compare.
 */
export async function detectAudienceOpportunities(
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
    .select("external_id, name")
    .eq("platform_account_id", platformAccountId)
    .eq("kind", "campaign");

  if (!campaignRows || campaignRows.length === 0) return;

  const { data: breakdownRows } = await supabase
    .from("campaign_breakdown_snapshots")
    .select("entity_id, age_range, gender, metric_key, value, captured_at")
    .eq("workspace_id", workspaceId)
    .in("entity_id", campaignRows.map((c) => c.external_id))
    .gte("captured_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (!breakdownRows || breakdownRows.length === 0) return;

  const opportunities: Array<{
    related_campaign_external_id: string; related_segment_key: string; opportunity_type: string; title: string;
    evidence: Record<string, unknown>; confidence: string;
  }> = [];

  for (const campaign of campaignRows) {
    // Latest CTR per real segment for this specific campaign — same
    // "latest value per group" pattern as resolveLatestMetrics, applied
    // to the segment dimension instead of the campaign dimension.
    const segmentCtr = new Map<string, { value: number; capturedAt: string }>();
    for (const row of breakdownRows) {
      if (row.entity_id !== campaign.external_id || row.metric_key !== "ctr") continue;
      const key = `${row.age_range}|${row.gender}`;
      const existing = segmentCtr.get(key);
      if (!existing || row.captured_at > existing.capturedAt) {
        segmentCtr.set(key, { value: row.value, capturedAt: row.captured_at });
      }
    }

    if (segmentCtr.size < 2) continue; // need real peer segments to compare against, same discipline as the campaign-level detector

    const values = Array.from(segmentCtr.values()).map((v) => v.value);
    const avgCtr = values.reduce((s, v) => s + v, 0) / values.length;
    const confidence = segmentCtr.size >= 6 ? "high" : segmentCtr.size >= 3 ? "medium" : "low";

    for (const [key, point] of segmentCtr.entries()) {
      if (point.value > avgCtr * 1.5) {
        const [ageRange, gender] = key.split("|");
        opportunities.push({
          related_campaign_external_id: campaign.external_id,
          related_segment_key: key,
          opportunity_type: "audience_segment_outperforming",
          title: `In "${campaign.name}", the ${ageRange} ${gender} segment is significantly outperforming other segments`,
          evidence: {
            segment_ctr: Number(point.value.toFixed(2)), campaign_avg_ctr: Number(avgCtr.toFixed(2)),
            age_range: ageRange, gender, campaign_name: campaign.name,
          },
          confidence,
        });
      }
    }
  }

  if (opportunities.length === 0) return;

  const { error } = await supabase.from("opportunities").upsert(
    opportunities.map((o) => ({ ...o, workspace_id: workspaceId, platform_account_id: platformAccountId, status: "open" })),
    { onConflict: "platform_account_id,related_campaign_external_id,opportunity_type,related_segment_key" }
  );

  if (error) {
    console.error(`[opportunities] failed to write detected audience opportunities for ${platformAccountId}:`, error.message);
  }
}

/**
 * Same real comparative discipline as detectAudienceOpportunities,
 * applied to the second breakdown dimension (placement + device
 * rather than age + gender). A genuinely separate function rather than
 * a parameterized generic one — the two breakdown tables have
 * different column shapes, and forcing them through one abstraction
 * would add indirection without saving meaningful code.
 */
export async function detectPlacementOpportunities(
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
    .select("external_id, name")
    .eq("platform_account_id", platformAccountId)
    .eq("kind", "campaign");

  if (!campaignRows || campaignRows.length === 0) return;

  const { data: placementRows } = await supabase
    .from("campaign_placement_snapshots")
    .select("entity_id, publisher_platform, platform_position, impression_device, metric_key, value, captured_at")
    .eq("workspace_id", workspaceId)
    .in("entity_id", campaignRows.map((c) => c.external_id))
    .gte("captured_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (!placementRows || placementRows.length === 0) return;

  const opportunities: Array<{
    related_campaign_external_id: string; related_segment_key: string; opportunity_type: string; title: string;
    evidence: Record<string, unknown>; confidence: string;
  }> = [];

  for (const campaign of campaignRows) {
    const segmentCtr = new Map<string, { value: number; capturedAt: string }>();
    for (const row of placementRows) {
      if (row.entity_id !== campaign.external_id || row.metric_key !== "ctr") continue;
      const key = `${row.publisher_platform}|${row.platform_position}|${row.impression_device}`;
      const existing = segmentCtr.get(key);
      if (!existing || row.captured_at > existing.capturedAt) {
        segmentCtr.set(key, { value: row.value, capturedAt: row.captured_at });
      }
    }

    if (segmentCtr.size < 2) continue;

    const values = Array.from(segmentCtr.values()).map((v) => v.value);
    const avgCtr = values.reduce((s, v) => s + v, 0) / values.length;
    const confidence = segmentCtr.size >= 6 ? "high" : segmentCtr.size >= 3 ? "medium" : "low";

    for (const [key, point] of segmentCtr.entries()) {
      if (point.value > avgCtr * 1.5) {
        const [platform, position, device] = key.split("|");
        opportunities.push({
          related_campaign_external_id: campaign.external_id,
          related_segment_key: key,
          opportunity_type: "placement_outperforming",
          title: `In "${campaign.name}", ${platform} ${position} on ${device} is significantly outperforming other placements`,
          evidence: {
            placement_ctr: Number(point.value.toFixed(2)), campaign_avg_ctr: Number(avgCtr.toFixed(2)),
            publisher_platform: platform, platform_position: position, device, campaign_name: campaign.name,
          },
          confidence,
        });
      }
    }
  }

  if (opportunities.length === 0) return;

  const { error } = await supabase.from("opportunities").upsert(
    opportunities.map((o) => ({ ...o, workspace_id: workspaceId, platform_account_id: platformAccountId, status: "open" })),
    { onConflict: "platform_account_id,related_campaign_external_id,opportunity_type,related_segment_key" }
  );

  if (error) {
    console.error(`[opportunities] failed to write detected placement opportunities for ${platformAccountId}:`, error.message);
  }
}

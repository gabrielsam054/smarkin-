import { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken } from "@/lib/crypto/tokenEncryption";
import { fetchAllPages } from "./fetchAllPages";

const GRAPH_API_VERSION = "v21.0";

/**
 * Real ad-level performance metrics — the foundational data layer
 * Creative Intelligence genuinely needs before any AI judgment about
 * creative effectiveness can exist honestly. Until this file, every
 * metric in this connector was requested at level: "campaign" only;
 * ad_entities had real creative metadata but zero real performance
 * data ever linked to it.
 *
 * Mirrors two already-proven patterns exactly: the campaign Insights
 * fetch in metaSync.ts (same fields, same actions/action_values
 * conversion extraction) and syncAdCreatives.ts's best-effort
 * structure (a failure here never risks the core metrics sync's own
 * already-confirmed success). entity_kind: "ad" is a real, safe
 * extension of metric_snapshots' existing schema, not a new column —
 * the table was already designed to support more than one entity kind.
 */
export async function syncAdInsights(supabase: SupabaseClient, platformAccountId: string): Promise<void> {
  console.error(`[syncAdInsights] Starting for platform_account ${platformAccountId}`);

  const { data: account } = await supabase
    .from("platform_accounts")
    .select("id, workspace_id, external_account_id")
    .eq("id", platformAccountId)
    .single();

  if (!account) {
    console.error(`[syncAdInsights] No account row found for platform_account ${platformAccountId} - stopping.`);
    return;
  }

  const { data: tokenRow } = await supabase
    .from("oauth_tokens")
    .select("enc_access_token")
    .eq("platform_account_id", platformAccountId)
    .maybeSingle();

  if (!tokenRow?.enc_access_token) {
    console.error(`[syncAdInsights] No token found for platform_account ${platformAccountId} - stopping.`);
    return;
  }

  const accessToken = decryptToken(Buffer.from(tokenRow.enc_access_token.replace(/^\\x/, ""), "hex"));

  try {
    const insightsUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/act_${account.external_account_id}/insights`);
    insightsUrl.searchParams.set("access_token", accessToken);
    insightsUrl.searchParams.set("level", "ad");
    insightsUrl.searchParams.set("fields", "ad_id,impressions,clicks,spend,ctr,reach,frequency,actions,action_values");
    // Real, deliberately narrower than campaign-level's "maximum"
    // backfill window — ad-level data is a genuinely new, unproven
    // addition; starting narrow (30 days) rather than requesting Meta's
    // full history reduces the size and risk of this first real run.
    // Widening later is a one-line change, not a design change — same
    // reasoning already applied to the original 90-day campaign window.
    insightsUrl.searchParams.set("date_preset", "last_30d");

    // TEMPORARY, more direct diagnostic: fetch the raw response
    // directly, bypassing fetchAllPages, to see exactly what Meta
    // returns for this specific request - a real error message in the
    // body, an empty-but-valid response, or something fetchAllPages
    // itself might be silently filtering out.
    const rawRes = await fetch(insightsUrl.toString());
    const rawBody = await rawRes.text();
    console.error(`[syncAdInsights][RAW] status: ${rawRes.status}, body: ${rawBody.slice(0, 1000)}`);

    const rows = await fetchAllPages<{
      ad_id: string; impressions?: string; clicks?: string; spend?: string; ctr?: string; reach?: string; frequency?: string;
      actions?: Array<{ action_type: string; value: string }>;
      action_values?: Array<{ action_type: string; value: string }>;
    }>(insightsUrl.toString(), `ad insights fetch for platform_account ${platformAccountId}`);

    console.error(`[syncAdInsights] Meta returned ${rows.length} real ad-level rows for platform_account ${platformAccountId}`);

    if (rows.length === 0) return;

    const capturedAt = new Date().toISOString();
    const snapshots = rows.flatMap((row) => {
      // Same real, disclosed conversion scope as campaign-level —
      // "purchase" only, not every action type Meta tracks.
      const purchaseAction = row.actions?.find((a) => a.action_type === "purchase");
      const purchaseValue = row.action_values?.find((a) => a.action_type === "purchase");

      const metrics: Array<[string, string | undefined]> = [
        ["impressions", row.impressions], ["clicks", row.clicks], ["spend", row.spend], ["ctr", row.ctr],
        ["reach", row.reach], ["frequency", row.frequency],
        ["conversions", purchaseAction?.value], ["conversion_value", purchaseValue?.value],
      ];
      return metrics
        .filter(([, value]) => value !== undefined)
        .map(([metricKey, value]) => ({
          workspace_id: account.workspace_id,
          entity_kind: "ad",
          entity_id: row.ad_id,
          metric_key: metricKey,
          value: Number(value),
          captured_at: capturedAt,
          source_window: "daily",
        }));
    });

    if (snapshots.length > 0) {
      const { error } = await supabase.from("metric_snapshots").insert(snapshots);
      if (error) {
        console.error(`[syncAdInsights] Failed to write ad-level snapshots for platform_account ${platformAccountId}:`, error.message);
      } else {
        console.error(`[syncAdInsights] Successfully wrote ${snapshots.length} ad-level snapshots for platform_account ${platformAccountId}`);
      }
    }
  } catch (err) {
    // Best-effort, deliberately — same philosophy as syncAdCreatives.ts.
    // A failure here must never risk the core campaign-level sync's
    // own already-confirmed success.
    console.error(`[syncAdInsights] Ad insights sync failed for platform_account ${platformAccountId}, continuing without it:`, err);
  }
}

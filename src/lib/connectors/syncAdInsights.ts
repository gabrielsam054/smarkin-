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
// TEMPORARY diagnostic logger - writes directly to a real table
// instead of console.error, since finding the right Vercel log line
// has proven unreliable multiple times this session. Raw fetch, no
// client library dependency, so a failure here can't be blamed on
// anything but the write itself.
async function debugLog(label: string, detail: string) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    await fetch(`${url}/rest/v1/temp_debug_log`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ label, detail }),
    });
  } catch { /* nothing more to do if even this fails */ }
}

export async function syncAdInsights(supabase: SupabaseClient, platformAccountId: string): Promise<void> {
  await debugLog("syncAdInsights-start", `platform_account: ${platformAccountId}`);

  const { data: account } = await supabase
    .from("platform_accounts")
    .select("id, workspace_id, external_account_id")
    .eq("id", platformAccountId)
    .single();

  if (!account) {
    await debugLog("syncAdInsights-no-account", `platform_account: ${platformAccountId}`);
    return;
  }

  const { data: tokenRow } = await supabase
    .from("oauth_tokens")
    .select("enc_access_token")
    .eq("platform_account_id", platformAccountId)
    .maybeSingle();

  if (!tokenRow?.enc_access_token) {
    await debugLog("syncAdInsights-no-token", `platform_account: ${platformAccountId}`);
    return;
  }

  const accessToken = decryptToken(Buffer.from(tokenRow.enc_access_token.replace(/^\\x/, ""), "hex"));

  try {
    const insightsUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/act_${account.external_account_id}/insights`);
    insightsUrl.searchParams.set("access_token", accessToken);
    insightsUrl.searchParams.set("level", "ad");
    insightsUrl.searchParams.set("fields", "ad_id,impressions,clicks,spend,ctr,reach,frequency,actions,action_values");
    insightsUrl.searchParams.set("date_preset", "last_30d");

    const rawRes = await fetch(insightsUrl.toString());
    const rawBody = await rawRes.text();
    await debugLog("syncAdInsights-raw-response", `status: ${rawRes.status}, body: ${rawBody.slice(0, 1800)}`);

    const rows = await fetchAllPages<{
      ad_id: string; impressions?: string; clicks?: string; spend?: string; ctr?: string; reach?: string; frequency?: string;
      actions?: Array<{ action_type: string; value: string }>;
      action_values?: Array<{ action_type: string; value: string }>;
    }>(insightsUrl.toString(), `ad insights fetch for platform_account ${platformAccountId}`);

    await debugLog("syncAdInsights-row-count", `${rows.length} real ad-level rows`);

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

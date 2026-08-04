import { buildServiceRoleClient } from "@/lib/supabase/serviceClient";
import { decryptToken, encryptToken } from "@/lib/crypto/tokenEncryption";
import { SyncJob } from "./queue";
import { checkCircuitBreaker, recordSyncSuccess } from "./connectorHealth";
import { metaConnector } from "../meta";

const GRAPH_API_VERSION = "v21.0";
const REFRESH_BUFFER_MS = 24 * 60 * 60 * 1000; // refresh if expiring within 24h

/**
 * Processes one claimed SyncJob for the Meta connector: loads the
 * account's encrypted token, decrypts it (tying Feature 8's encryption
 * work into actual use, not just storage), pulls campaign-level
 * insights via Meta's documented Insights API, and writes normalized
 * rows into metric_snapshots — matching the Event Store's real schema
 * exactly (workspace_id, entity_kind, entity_id, metric_key, value,
 * captured_at), not an invented shape.
 *
 * Same honest split as the OAuth flow: the request/write logic is
 * correct against documented contracts on both ends (Meta's API shape,
 * v16's table shape); actually succeeding against Meta's live servers
 * and a live database is unverifiable from this sandbox.
 */
export class CircuitOpenError extends Error {
  constructor(platformAccountId: string, state: string) {
    super(`Circuit breaker open for platform_account ${platformAccountId} (state: ${state}) — skipping this attempt.`);
    this.name = "CircuitOpenError";
  }
}

export async function syncMetaCampaignInsights(job: SyncJob): Promise<void> {
  const { canProceed, state } = await checkCircuitBreaker(job.platformAccountId);
  if (!canProceed) {
    // A distinguishable error type, not a generic throw — the caller
    // (the cron route) needs to tell "we deliberately didn't attempt
    // this sync" apart from "we attempted it and it failed," or it
    // would call recordSyncFailure on a skip, incorrectly extending
    // the circuit's own cooldown every tick it stays open.
    throw new CircuitOpenError(job.platformAccountId, state);
  }

  const supabase = buildServiceRoleClient();
  if (!supabase) {
    // buildServiceRoleClient() returns null when its required env vars
    // are missing (the same defensive pattern used elsewhere in this
    // project) — assumed non-null here originally, which the real build
    // caught. Throwing here is deliberate, not a fallback to silent
    // no-op: this is service-role system code, and a job that "succeeds"
    // by doing nothing is worse than one that fails loudly and gets
    // retried/dead-lettered by the caller's existing handling.
    throw new Error("buildServiceRoleClient() returned null — service-role credentials are not configured.");
  }

  const { data: account, error: accountError } = await supabase
    .from("platform_accounts")
    .select("id, workspace_id, external_account_id, oauth_tokens(enc_access_token, expires_at)")
    .eq("id", job.platformAccountId)
    .single();

  if (accountError || !account) {
    throw new Error(`platform_account ${job.platformAccountId} not found or oauth_tokens missing`);
  }

  const tokenRow = (account as unknown as { oauth_tokens: { enc_access_token: string; expires_at: string | null } | null }).oauth_tokens;
  if (!tokenRow?.enc_access_token) {
    throw new Error(`No stored token for platform_account ${job.platformAccountId}`);
  }

  // Supabase returns bytea columns as hex-prefixed strings ("\\x...")
  // over PostgREST by default — decode before handing to decryptToken,
  // which expects a raw Buffer. Flagged explicitly: this hex-decode
  // step is a real Supabase/PostgREST behavior, not a guess, but its
  // exact current encoding format is worth a quick live check the
  // first time this runs against a real row.
  let accessToken = decryptToken(Buffer.from(tokenRow.enc_access_token.replace(/^\\x/, ""), "hex"));

  // The gap this feature closes: refreshTokens() has existed since
  // Feature 8 and was never called. Without this check, a token that
  // eventually expires would fail every sync permanently, trip the
  // circuit breaker (Feature 12), and never recover — self-healing code
  // that existed but wasn't wired into the one path that needed it.
  const expiresAt = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : null;
  if (expiresAt !== null && expiresAt - Date.now() < REFRESH_BUFFER_MS) {
    const refreshed = await metaConnector.refreshTokens(accessToken);
    if (refreshed) {
      accessToken = refreshed.accessToken;
      const { error: updateError } = await supabase
        .from("oauth_tokens")
        .update({
          // Same fix as completeConnection.ts: convert to the "\x"-
          // prefixed hex string Postgres's bytea column actually
          // expects, not a raw Buffer that JSON-serializes incorrectly.
          enc_access_token: "\\x" + encryptToken(refreshed.accessToken).toString("hex"),
          expires_at: refreshed.expiresAt,
        })
        .eq("platform_account_id", job.platformAccountId);

      if (updateError) {
        // Don't abort the sync over a failed token-row update — the
        // refreshed token is still valid in memory for THIS run; only
        // the NEXT run would retry the (still-expiring) old one from
        // storage. Log clearly so it's visible, but let this sync
        // proceed with the token we already have.
        console.error(`[sync] token refreshed but failed to persist for ${job.platformAccountId}:`, updateError.message);
      }
    } else {
      // refreshTokens() returned null — this connector doesn't support
      // refresh, or the refresh attempt itself failed. Proceed with the
      // current (soon-to-expire) token rather than aborting outright;
      // if it's already invalid, the Insights call below will fail
      // naturally and go through the normal failure/circuit-breaker path.
      console.error(`[sync] token refresh unavailable or failed for ${job.platformAccountId}; proceeding with existing token.`);
    }
  }

  const insightsUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/act_${account.external_account_id}/insights`);
  insightsUrl.searchParams.set("access_token", accessToken);
  insightsUrl.searchParams.set("level", "campaign");
  insightsUrl.searchParams.set("fields", "campaign_id,campaign_name,impressions,clicks,spend,ctr");
  // The gap this closes: job.jobClass was carried through the entire
  // pipeline since Feature 10 and never read here — every sync,
  // including the explicitly-designed first "backfill" job, was
  // fetching the same single day as every routine tick. A real
  // distinction now: backfill pulls a real window of history;
  // incremental stays narrow. 90 days, not the 2.1 blueprint's ideal
  // 6-12 months — a deliberate, bounded choice to keep a newly
  // connected account's first request fast and predictable rather than
  // risk one huge slow call; widening this later is a one-line change,
  // not a design change.
  insightsUrl.searchParams.set("date_preset", job.jobClass === "backfill" ? "last_90d" : "yesterday");

  const res = await fetch(insightsUrl.toString());
  if (!res.ok) {
    // Meta returns a specific, documented error shape for invalid/
    // revoked tokens: { error: { type: "OAuthException", code: 190 } }.
    // Distinguishing this from a generic failure closes the gap:
    // ConnectorStatusDot already has a "Revoked — needs reconnect"
    // state (Feature 6) that nothing ever set — a revoked token was
    // just failing forever as an undifferentiated error, tripping the
    // circuit breaker in an endless loop instead of surfacing the
    // actionable state the UI was already built to show.
    let isRevoked = false;
    try {
      const errorBody = await res.json() as { error?: { type?: string; code?: number } };
      isRevoked = errorBody.error?.type === "OAuthException" && errorBody.error?.code === 190;
    } catch {
      // Response wasn't JSON or didn't match the expected shape —
      // treat as a generic failure below, not as revoked. Guessing
      // "revoked" from an unparseable response would be worse than an
      // honest generic failure; false-positive revocation would show
      // the user a misleading "needs reconnect" for what might just be
      // a transient network/rate-limit issue.
    }

    if (isRevoked) {
      const supabaseForRevoke = buildServiceRoleClient();
      if (supabaseForRevoke) {
        await supabaseForRevoke.from("platform_accounts").update({ status: "revoked" }).eq("id", job.platformAccountId);
      }
      throw new Error(`Meta token revoked for platform_account ${job.platformAccountId} (OAuthException 190)`);
    }

    throw new Error(`Meta Insights API returned ${res.status}`);
  }

  const body = await res.json() as { data: Array<{ campaign_id: string; campaign_name?: string; impressions?: string; clicks?: string; spend?: string; ctr?: string }> };

  const capturedAt = new Date().toISOString();
  const snapshots = body.data.flatMap((row) => {
    const metrics: Array<[string, string | undefined]> = [
      ["impressions", row.impressions], ["clicks", row.clicks], ["spend", row.spend], ["ctr", row.ctr],
    ];
    return metrics
      .filter(([, value]) => value !== undefined)
      .map(([metricKey, value]) => ({
        workspace_id: account.workspace_id,
        entity_kind: "campaign",
        entity_id: row.campaign_id,
        metric_key: metricKey,
        value: Number(value),
        captured_at: capturedAt,
      }));
  });

  if (snapshots.length === 0) {
    await recordSyncSuccess(job.platformAccountId); // ran cleanly, just no rows today — still a real success
    return;
  }

  // The gap this closes: campaign_name was requested from Meta's API
  // the whole time and silently discarded — metric_snapshots only ever
  // stored a raw campaign_id, with nowhere the campaign's actual name
  // was captured. Upserting real campaign_entities rows here is what
  // makes a genuine Campaigns page possible at all, not just a table of
  // opaque ids next to numbers.
  const campaignEntities = body.data
    .filter((row) => row.campaign_name)
    .map((row) => ({
      workspace_id: account.workspace_id,
      platform_account_id: job.platformAccountId,
      external_id: row.campaign_id,
      kind: "campaign" as const,
      name: row.campaign_name,
      synced_at: capturedAt,
    }));

  if (campaignEntities.length > 0) {
    const { error: entityError } = await supabase
      .from("campaign_entities")
      .upsert(campaignEntities, { onConflict: "platform_account_id,external_id" });
    if (entityError) {
      // Don't abort the whole sync over this — the metrics themselves
      // are still real and worth keeping even if the name-upsert
      // failed; log clearly so it's visible without discarding the run.
      console.error(`[sync] failed to upsert campaign_entities for platform_account ${job.platformAccountId}:`, entityError.message);
    }
  }

  const { error: insertError } = await supabase.from("metric_snapshots").insert(snapshots);
  if (insertError) {
    throw new Error(`Failed writing metric_snapshots (table may not exist yet): ${insertError.message}`);
  }

  await recordSyncSuccess(job.platformAccountId);
}

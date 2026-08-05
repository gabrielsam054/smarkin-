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

  // Two simple, independent queries instead of PostgREST's embedded-
  // relationship syntax (oauth_tokens(...) nested in the select) —
  // that syntax depends on PostgREST's schema cache correctly
  // recognizing the FK relationship, which has now been unreliable
  // twice in this same session (claim_sync_jobs and this) after DDL
  // run directly via the SQL Editor. Two plain queries have no such
  // dependency and can't silently return null for a row that
  // genuinely exists.
  const { data: account, error: accountError } = await supabase
    .from("platform_accounts")
    .select("id, workspace_id, external_account_id")
    .eq("id", job.platformAccountId)
    .single();

  if (accountError || !account) {
    throw new Error(`platform_account ${job.platformAccountId} not found`);
  }

  const { data: tokenRow, error: tokenLookupError } = await supabase
    .from("oauth_tokens")
    .select("enc_access_token, expires_at")
    .eq("platform_account_id", job.platformAccountId)
    .maybeSingle();

  if (tokenLookupError) {
    throw new Error(`Failed looking up oauth_tokens for platform_account ${job.platformAccountId}: ${tokenLookupError.message}`);
  }
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
  // Widened from the original 90-day starting point: confirmed too
  // narrow for accounts whose real campaigns are older with no recent
  // spend — Meta's Insights API reports performance, not a directory
  // of all campaigns, so a narrow window can legitimately return zero
  // rows for an account that's genuinely connected and has real history
  // further back. "maximum" is Meta's own broadest available range.
  insightsUrl.searchParams.set("date_preset", job.jobClass === "backfill" ? "maximum" : "yesterday");

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
  // Tagged at write time, not reconstructed later — a backfill's
  // aggregate row and a daily incremental row are fundamentally
  // different kinds of data (months of history vs. one real day), and
  // the only reliable place to know which is which is right here,
  // where job.jobClass is unambiguous.
  const sourceWindow = job.jobClass === "backfill" ? "backfill_aggregate" : "daily";
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
        source_window: sourceWindow,
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
  // Real budget data — a genuinely separate Meta API call, since
  // budget lives on the campaign object itself, never on Insights
  // (which only reports what was actually spent, not what was
  // allotted). Fetches every campaign on the account rather than
  // filtering to specific IDs — simpler and more robust than relying
  // on Meta's filtering query-param syntax, which isn't something this
  // connector can verify without a live response to test against.
  //
  // Meta returns daily_budget/lifetime_budget in the account's
  // currency's MINOR unit (cents for USD) — divided by 100 here to
  // match spend's existing major-unit convention (dollars). Correct
  // against Meta's documented API behavior; like every other Meta
  // response-shape assumption in this connector, genuinely unverified
  // against a live account until this runs for real.
  const budgetByCampaignId = new Map<string, { dailyBudget: number | null; lifetimeBudget: number | null }>();
  try {
    const budgetUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/act_${account.external_account_id}/campaigns`);
    budgetUrl.searchParams.set("access_token", accessToken);
    budgetUrl.searchParams.set("fields", "id,daily_budget,lifetime_budget");
    const budgetRes = await fetch(budgetUrl.toString());
    if (budgetRes.ok) {
      const budgetBody = await budgetRes.json() as { data: Array<{ id: string; daily_budget?: string; lifetime_budget?: string }> };
      for (const c of budgetBody.data) {
        budgetByCampaignId.set(c.id, {
          dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
          lifetimeBudget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
        });
      }
    } else {
      console.error(`[sync] budget fetch returned ${budgetRes.status} for platform_account ${job.platformAccountId} — campaign_entities will save without budget data this run.`);
    }
  } catch (err) {
    // Best-effort, deliberately: budget is real, valuable enrichment,
    // not a dependency the core sync should fail over. A failed budget
    // fetch still lets the actual performance metrics (already
    // resolved above) save correctly.
    console.error(`[sync] budget fetch failed for platform_account ${job.platformAccountId}, continuing without it:`, err);
  }

  const campaignEntities = body.data
    .filter((row) => row.campaign_name)
    .map((row) => ({
      workspace_id: account.workspace_id,
      platform_account_id: job.platformAccountId,
      external_id: row.campaign_id,
      kind: "campaign" as const,
      name: row.campaign_name,
      synced_at: capturedAt,
      daily_budget: budgetByCampaignId.get(row.campaign_id)?.dailyBudget ?? null,
      lifetime_budget: budgetByCampaignId.get(row.campaign_id)?.lifetimeBudget ?? null,
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

  // Real audience breakdown data — a separate call, deliberately
  // scoped to age+gender only (the one combination Meta documents as
  // compatible together in a single request; placement/device/country
  // is a different compatibility group and a genuinely separate call,
  // not bundled in here). Best-effort: runs after the core metrics
  // are already safely written, so a breakdown failure never risks
  // the sync's own real, already-confirmed success.
  try {
    const breakdownUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/act_${account.external_account_id}/insights`);
    breakdownUrl.searchParams.set("access_token", accessToken);
    breakdownUrl.searchParams.set("level", "campaign");
    breakdownUrl.searchParams.set("fields", "campaign_id,impressions,clicks,spend,ctr");
    breakdownUrl.searchParams.set("breakdowns", "age,gender");
    breakdownUrl.searchParams.set("date_preset", job.jobClass === "backfill" ? "maximum" : "yesterday");

    const breakdownRes = await fetch(breakdownUrl.toString());
    if (breakdownRes.ok) {
      const breakdownBody = await breakdownRes.json() as {
        data: Array<{ campaign_id: string; age?: string; gender?: string; impressions?: string; clicks?: string; spend?: string; ctr?: string }>
      };

      const breakdownSnapshots = breakdownBody.data.flatMap((row) => {
        if (!row.age || !row.gender) return []; // Meta can return an "unknown" bucket without these — skip rather than store a misleading blank segment
        const metrics: Array<[string, string | undefined]> = [
          ["impressions", row.impressions], ["clicks", row.clicks], ["spend", row.spend], ["ctr", row.ctr],
        ];
        return metrics
          .filter(([, value]) => value !== undefined)
          .map(([metricKey, value]) => ({
            workspace_id: account.workspace_id,
            platform_account_id: job.platformAccountId,
            entity_id: row.campaign_id,
            age_range: row.age!,
            gender: row.gender!,
            metric_key: metricKey,
            value: Number(value),
            captured_at: capturedAt,
            source_window: sourceWindow,
          }));
      });

      if (breakdownSnapshots.length > 0) {
        const { error: breakdownInsertError } = await supabase.from("campaign_breakdown_snapshots").insert(breakdownSnapshots);
        if (breakdownInsertError) {
          console.error(`[sync] failed writing campaign_breakdown_snapshots for platform_account ${job.platformAccountId} (table may not exist yet):`, breakdownInsertError.message);
        }
      }
    } else {
      console.error(`[sync] breakdown fetch returned ${breakdownRes.status} for platform_account ${job.platformAccountId} — continuing without audience breakdown data this run.`);
    }
  } catch (err) {
    console.error(`[sync] breakdown fetch failed for platform_account ${job.platformAccountId}, continuing without it:`, err);
  }

  await recordSyncSuccess(job.platformAccountId);
}

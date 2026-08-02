import { NextRequest, NextResponse } from "next/server";
import { claimSyncJobs, markJobSucceeded, markJobFailed, enqueueNextIncrementalJob, reapStaleJobs } from "@/lib/connectors/sync/queue";
import { syncMetaCampaignInsights, CircuitOpenError } from "@/lib/connectors/sync/metaSync";
import { recordSyncFailure } from "@/lib/connectors/sync/connectorHealth";

/**
 * Vercel Cron invokes this on a schedule (add to vercel.json — not
 * included in this feature, since cron scheduling is deployment
 * config, not application code, and its cadence is a real product
 * decision, not mine to silently pick). Authenticated via a shared
 * secret header, the standard Vercel Cron protection pattern — NOT
 * requireUser(), because a cron trigger has no user session to check.
 * Using the wrong auth mechanism here (or none) would either reject
 * every real cron invocation or leave the endpoint open to anyone who
 * finds the URL.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error("[cron/sync] CRON_SECRET is not set — refusing all requests until configured.");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Reap BEFORE claiming: a stale job reset back to "queued" here can
  // be claimed and reprocessed in this SAME tick, not left waiting for
  // the next one.
  const reaped = await reapStaleJobs();

  const jobs = await claimSyncJobs(5);
  const results = { reaped, claimed: jobs.length, succeeded: 0, failed: 0, skippedCircuitOpen: 0 };

  for (const job of jobs) {
    // Structured as if/else, not try/catch-with-continue, specifically
    // so every branch falls through to the shared enqueueNextIncrementalJob
    // call below — an earlier draft had a `continue` in the circuit-skip
    // branch that would have silently bypassed it, contradicting this
    // whole feature's point: every account must get a next job
    // regardless of what happened to its last one.
    try {
      // Only Meta is implemented (Feature 8's bootstrap registers only
      // meta_ads) — a job for any other connector_key would need its
      // own sync function, added here one branch at a time as
      // connectors are implemented, per the Extension Rule.
      await syncMetaCampaignInsights(job);
      await markJobSucceeded(job.id);
      results.succeeded++;
    } catch (err) {
      if (err instanceof CircuitOpenError) {
        // Deliberate skip, not a failure — connector_health is NOT
        // touched here. Recording this as a failure would incorrectly
        // extend the circuit's own cooldown every tick it stays open,
        // which would make an open circuit self-perpetuate rather than
        // actually testing recovery after the cooldown.
        console.log(`[cron/sync] job ${job.id} skipped: ${err.message}`);
        await markJobFailed(job.id, err.message, job.attempts);
        results.skippedCircuitOpen++;
      } else {
        const message = err instanceof Error ? err.message : "Unknown sync error";
        console.error(`[cron/sync] job ${job.id} failed:`, message);
        await markJobFailed(job.id, message, job.attempts);
        await recordSyncFailure(job.platformAccountId, message);
        results.failed++;
      }
    }

    // Unconditional — the point of this feature. A dead-lettered job
    // still gets a fresh successor queued; the circuit breaker (a
    // separate, account-level concern) is what actually decides whether
    // that successor gets attempted when it's claimed, not whether it
    // gets created at all.
    await enqueueNextIncrementalJob(job.platformAccountId);
  }

  return NextResponse.json(results);
}

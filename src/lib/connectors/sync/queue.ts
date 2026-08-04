import { buildServiceRoleClient } from "@/lib/supabase/serviceClient";

/**
 * Matches sync_jobs exactly (v16_core_schema_v2.sql). Rows returned by
 * the claim_sync_jobs() RPC (v16_4_sync_worker.sql) — the actual
 * FOR UPDATE SKIP LOCKED claim happens inside that Postgres function,
 * not here; this is a thin, honest wrapper, not a reimplementation of
 * the locking logic in application code (which would be racy —
 * concurrency-safe claiming has to happen inside the database
 * transaction, not in JS after the fact).
 */
export interface SyncJob {
  id: number;
  platformAccountId: string;
  jobClass: "incremental" | "backfill";
  status: "queued" | "running" | "succeeded" | "failed" | "dead";
  attempts: number;
}

const STALE_RUNNING_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes — well beyond any realistic processing time for this workload

/**
 * Closes the gap Feature 15's own duplicate-guard introduced: a job
 * that crashes or times out mid-processing stays at status='running'
 * forever, and since enqueueNextIncrementalJob treats 'running' as
 * "already pending, don't create a successor," one stuck job would
 * permanently silence that account — no reclaim, no new job, ever.
 *
 * Reuses markJobFailed rather than a separate reset path, deliberately:
 * a stale job IS a real failure (something crashed or ran too long),
 * and it should go through the same attempts-based dead-letter logic
 * as any other failure, not bypass it via an unlimited "just requeue
 * forever" reset that could loop a genuinely broken job indefinitely.
 * Called at the START of the cron route, before claiming new jobs, so
 * a stale job gets a chance to be reset-and-reclaimed in the same tick
 * that notices it.
 */
export async function reapStaleJobs(): Promise<number> {
  const supabase = buildServiceRoleClient();
  if (!supabase) {
    console.error("[sync] buildServiceRoleClient() returned null — could not reap stale jobs.");
    return 0;
  }

  const staleCutoff = new Date(Date.now() - STALE_RUNNING_THRESHOLD_MS).toISOString();
  const { data: stale, error } = await supabase
    .from("sync_jobs")
    .select("id, attempts")
    .eq("status", "running")
    .lt("started_at", staleCutoff);

  if (error) {
    console.error("[sync] failed to query stale running jobs:", error.message);
    return 0;
  }
  if (!stale || stale.length === 0) return 0;

  for (const job of stale as Array<{ id: number; attempts: number }>) {
    await markJobFailed(job.id, "Job timed out or crashed while running (reaped after exceeding the stale-running threshold)", job.attempts);
  }

  return stale.length;
}

export async function claimSyncJobs(limit: number): Promise<SyncJob[]> {
  const supabase = buildServiceRoleClient();
  if (!supabase) {
    // Same null-signature bug as metaSync.ts, same fix. Here it follows
    // this function's OWN existing defensive pattern (see the RPC-error
    // branch just below) rather than throwing — a cron tick that claims
    // zero jobs because credentials are misconfigured should log loudly
    // and return an empty batch, not crash the whole route.
    console.error("[sync] buildServiceRoleClient() returned null — service-role credentials are not configured.");
    return [];
  }
  const { data, error } = await supabase.rpc("claim_sync_jobs", { job_limit: limit });

  if (error) {
    // Defensive, same pattern as every other query against not-yet-live
    // v16 tables this session: log clearly, return empty rather than
    // throw — a cron route crashing entirely because sync_jobs doesn't
    // exist yet would be a worse failure mode than "processed 0 jobs."
    console.error("[sync] claim_sync_jobs RPC failed (table may not exist yet):", error.message);
    return [];
  }

  return ((data ?? []) as unknown as Array<{
    id: number; platform_account_id: string; job_class: SyncJob["jobClass"];
    status: SyncJob["status"]; attempts: number;
  }>).map((row) => ({
    id: row.id,
    platformAccountId: row.platform_account_id,
    jobClass: row.job_class,
    status: row.status,
    attempts: row.attempts,
  }));
}

export async function markJobSucceeded(jobId: number) {
  const supabase = buildServiceRoleClient();
  if (!supabase) {
    // Deliberately does NOT throw: the actual sync work already
    // succeeded by the time this runs. Throwing here would surface as
    // a job "failure" in the route's try/catch, misleadingly implying
    // the sync itself failed when only this status write did.
    console.error(`[sync] buildServiceRoleClient() returned null — could not mark job ${jobId} succeeded.`);
    return;
  }
  await supabase.from("sync_jobs").update({ status: "succeeded", finished_at: new Date().toISOString() }).eq("id", jobId);
}

export async function markJobFailed(jobId: number, errorMessage: string, attempts: number) {
  const supabase = buildServiceRoleClient();
  if (!supabase) {
    console.error(`[sync] buildServiceRoleClient() returned null — could not mark job ${jobId} failed (original error: ${errorMessage}).`);
    return;
  }
  // Dead-letter after 5 attempts — matches the "dead-letter handling
  // into the existing operational_errors pattern" recommendation from
  // the 2.1 blueprint's queue critique (§1.1).
  const status = attempts >= 5 ? "dead" : "queued"; // requeue for retry unless exhausted
  await supabase.from("sync_jobs").update({
    status, finished_at: status === "dead" ? new Date().toISOString() : null, error: errorMessage,
  }).eq("id", jobId);

  if (status === "dead") {
    await supabase.from("operational_errors").insert({
      source: "sync_worker", message: `Job ${jobId} exhausted retries: ${errorMessage}`,
    }).then(({ error }) => {
      // Defensive on this write too — operational_errors' exact column
      // names were never confirmed from this sandbox (flagged
      // identically in v16_2_engineering.sql's draft-audit trigger).
      if (error) console.error("[sync] failed to write dead-letter to operational_errors:", error.message);
    });
  }
}

/**
 * Closes the gap: sync_jobs rows were only ever created once, in the
 * OAuth callback (Feature 10). Nothing ever created a follow-up job —
 * every connected account synced exactly once, ever, then went
 * permanently silent, which made every downstream mechanism (circuit
 * breaker, health tracking, token refresh) moot: none of them get a
 * second chance to run without a second job.
 *
 * Called after EVERY outcome (success, failure, or circuit-breaker
 * skip) in the cron route's loop — an account must never go silent as
 * long as cron keeps firing, regardless of what happened to its last
 * job. Deliberately separate from the circuit breaker: this function's
 * job is "does a job exist to attempt," not "should we attempt it" —
 * that second question is checkCircuitBreaker's job, evaluated when the
 * enqueued job is actually claimed, not at enqueue time. Keeping these
 * two concerns separate means a dead-lettered job still gets a fresh
 * successor queued; only a genuinely open circuit skips the attempt.
 *
 * Guards against duplicate accumulation: does nothing if this account
 * already has a queued or running job (e.g. this tick's job took long
 * enough that another enqueue call arrives before it's claimed).
 */
export async function enqueueNextIncrementalJob(platformAccountId: string): Promise<void> {
  const supabase = buildServiceRoleClient();
  if (!supabase) {
    console.error(`[sync] buildServiceRoleClient() returned null — could not enqueue next job for ${platformAccountId}.`);
    return;
  }

  // Closes the other half of the gap: nothing previously checked
  // platform_accounts.status before enqueueing at all. A user-paused
  // account, or one just detected as revoked, should stop being synced
  // — continuing to enqueue jobs for either would be either ignoring
  // the user's own action (paused) or futilely retrying a connection
  // that cannot recover without the user re-authenticating (revoked).
  const { data: account } = await supabase
    .from("platform_accounts")
    .select("status")
    .eq("id", platformAccountId)
    .maybeSingle();

  if (account && (account.status === "revoked" || account.status === "paused")) {
    return; // no new job — this account isn't meant to sync right now
  }

  const { data: existing } = await supabase
    .from("sync_jobs")
    .select("id")
    .eq("platform_account_id", platformAccountId)
    .in("status", ["queued", "running"])
    .limit(1)
    .maybeSingle();

  if (existing) return; // already has a pending job — don't pile on another

  const { error } = await supabase.from("sync_jobs").insert({
    platform_account_id: platformAccountId,
    job_class: "incremental",
    status: "queued",
  });

  if (error) {
    console.error(`[sync] failed to enqueue next incremental job for ${platformAccountId}:`, error.message);
  }
}

/**
 * Closes a real product gap: without this, connecting an account only
 * queued a job for the next scheduled cron tick — on the Hobby-tier
 * once-daily schedule, that's up to a full day before a user sees any
 * data from an account they just connected. This attempts that first
 * sync immediately, right in the connect flow, so the very first
 * impression is fast; every sync after this one still follows the
 * normal daily cadence via enqueueNextIncrementalJob.
 *
 * Deliberately does NOT throw on failure — if Meta's API is briefly
 * unavailable or slow right at this moment, the job is already safely
 * queued and the next cron tick will retry it normally. This is a
 * best-effort acceleration, not a new failure mode for the connect flow
 * to depend on.
 */
export async function attemptImmediateSync(job: { id: number; platformAccountId: string; jobClass: "incremental" | "backfill" }): Promise<void> {
  const supabase = buildServiceRoleClient();
  if (!supabase) {
    console.error("[sync] buildServiceRoleClient() returned null — skipping immediate sync attempt, job remains queued for the next cron tick.");
    return;
  }

  // Mark running the same way claimSyncJobs does, so this job is
  // indistinguishable from a normally-claimed one to every downstream
  // function (circuit breaker, health tracking, the reaper).
  await supabase.from("sync_jobs").update({ status: "running", started_at: new Date().toISOString(), attempts: 1 }).eq("id", job.id);

  try {
    // Dynamic import, deliberately: metaSync.ts imports SyncJob (a type)
    // from this file, so a static top-level import of metaSync.ts here
    // would create a genuine circular dependency — type-only circular
    // imports are usually harmless since types erase at compile time,
    // but this needs the actual function value, which is the fragile
    // case (module-initialization-order dependent). The dynamic import
    // resolves this cleanly since it only executes after both modules
    // have finished loading.
    const { syncMetaCampaignInsights } = await import("./metaSync");
    await syncMetaCampaignInsights({ id: job.id, platformAccountId: job.platformAccountId, jobClass: job.jobClass, status: "running", attempts: 1 });
    await markJobSucceeded(job.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown immediate-sync error";
    console.error(`[sync] immediate sync attempt failed for job ${job.id}, leaving it queued for the next cron tick:`, message);
    // attempts=1 here (not job.attempts, since this path bypassed the
    // normal claim increment) — deliberately conservative so a failed
    // immediate attempt doesn't eat into the job's real retry budget.
    await markJobFailed(job.id, message, 1);
  }
}

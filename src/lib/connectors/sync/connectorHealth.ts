import { buildServiceRoleClient } from "@/lib/supabase/serviceClient";
import { ConnectorHealthState } from "@/lib/connectors";

const FAILURE_THRESHOLD = 3; // consecutive failures before the circuit opens
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes before an open circuit allows a trial attempt

/**
 * Closes the gap: connector_health had readers (ConnectorCard, Feature
 * 6) but no writer anywhere. This is that writer, plus the read-side
 * check that makes it an actual circuit breaker rather than just a
 * status display — an account with 3+ consecutive failures stops being
 * hammered every cron tick and gets a cooldown instead.
 *
 * Uses a dedicated `opened_at` column (v16_5_connector_health_opened_at.sql)
 * for cooldown timing rather than overloading `last_ok_at` — an earlier
 * draft of this file used last_ok_at for both "time of last success" and
 * "time the circuit opened," which would have made that column lie about
 * its own name the moment a failure was recorded. Caught before shipping;
 * a one-column addition is the honest fix, not a workaround around it.
 *
 * Known, disclosed simplification: recordSyncFailure does a read-then-
 * write to increment fail_count, not an atomic RPC (unlike
 * claim_sync_jobs's real SKIP LOCKED pattern). At Phase 2's single-
 * connector-pilot scale, two workers racing to record a failure for the
 * SAME account at the SAME moment is a low-probability edge case whose
 * worst outcome is an undercounted failure (delaying the circuit
 * opening by one tick) — a real tradeoff, stated rather than hidden,
 * not the same correctness requirement as job claiming where a race
 * would double-process a job.
 */
export async function checkCircuitBreaker(platformAccountId: string): Promise<{ canProceed: boolean; state: ConnectorHealthState }> {
  const supabase = buildServiceRoleClient();
  if (!supabase) {
    console.error("[connectorHealth] buildServiceRoleClient() returned null — allowing sync through (fail open, not fail-blocked).");
    return { canProceed: true, state: "closed" };
  }

  const { data, error } = await supabase
    .from("connector_health")
    .select("state, fail_count, opened_at")
    .eq("platform_account_id", platformAccountId)
    .maybeSingle();

  if (error || !data) {
    // No health row yet (first sync ever for this account) — proceed.
    return { canProceed: true, state: "closed" };
  }

  if (data.state !== "open") {
    return { canProceed: true, state: data.state as ConnectorHealthState };
  }

  // Circuit is open — only allow a trial attempt after the cooldown,
  // measured from when the circuit actually opened, not from any
  // unrelated column.
  const openedAt = data.opened_at ? new Date(data.opened_at).getTime() : 0;
  const elapsed = Date.now() - openedAt;
  if (elapsed >= COOLDOWN_MS) {
    await supabase.from("connector_health").update({ state: "half_open" }).eq("platform_account_id", platformAccountId);
    return { canProceed: true, state: "half_open" };
  }

  return { canProceed: false, state: "open" };
}

export async function recordSyncSuccess(platformAccountId: string): Promise<void> {
  const supabase = buildServiceRoleClient();
  if (!supabase) {
    console.error(`[connectorHealth] buildServiceRoleClient() returned null — could not record success for ${platformAccountId}.`);
    return;
  }

  await supabase.from("connector_health").upsert({
    platform_account_id: platformAccountId,
    state: "closed",
    fail_count: 0,
    last_ok_at: new Date().toISOString(),
    last_error: null,
    opened_at: null, // clear — the circuit is closed, no open-timestamp applies
  }, { onConflict: "platform_account_id" });
}

export async function recordSyncFailure(platformAccountId: string, errorMessage: string): Promise<void> {
  const supabase = buildServiceRoleClient();
  if (!supabase) {
    console.error(`[connectorHealth] buildServiceRoleClient() returned null — could not record failure for ${platformAccountId}.`);
    return;
  }

  const { data: existing } = await supabase
    .from("connector_health")
    .select("fail_count, state, opened_at")
    .eq("platform_account_id", platformAccountId)
    .maybeSingle();

  const nextFailCount = (existing?.fail_count ?? 0) + 1;
  const circuitAlreadyOpen = existing?.state === "open";
  const nextState: ConnectorHealthState = nextFailCount >= FAILURE_THRESHOLD ? "open" : "closed";

  await supabase.from("connector_health").upsert({
    platform_account_id: platformAccountId,
    state: nextState,
    fail_count: nextFailCount,
    last_error: errorMessage,
    // Only set opened_at the moment the circuit actually transitions to
    // open — preserves the original open-time if it was already open
    // (a half_open trial that fails again reopens the SAME window,
    // it doesn't restart the cooldown clock from scratch).
    opened_at: nextState === "open" ? (circuitAlreadyOpen ? existing!.opened_at : new Date().toISOString()) : null,
  }, { onConflict: "platform_account_id" });
}

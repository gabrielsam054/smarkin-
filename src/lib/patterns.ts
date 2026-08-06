import { SupabaseClient } from "@supabase/supabase-js";

const MIN_DAYS_REQUIRED = 14; // real, disclosed threshold — two full weeks, ensuring every weekday has appeared at least twice before any comparison is attempted

export interface PatternResult {
  ready: boolean;
  daysCollected: number;
  daysNeeded: number;
  patterns: Array<{ dayOfWeek: string; avgCtr: number; accountAvgCtr: number; occurrences: number }>;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * The one honest thing to build for Patterns before real weeks of
 * history exist: the real detection logic itself, gated behind a real
 * minimum threshold, rather than either refusing to touch it or
 * fabricating a "pattern" from a handful of days that would be
 * mathematically indistinguishable from noise. Same "insufficient
 * data" discipline already proven throughout today's health/trend
 * work — applied here at the account level instead of per-metric.
 *
 * Day-of-week CTR consistency is the specific pattern chosen: real,
 * genuinely detectable once enough weeks exist, and directly useful
 * (which days to prioritize spend on) rather than an abstract
 * statistical curiosity.
 */
export async function detectPatterns(supabase: SupabaseClient, workspaceId: string): Promise<PatternResult> {
  const { data: accounts } = await supabase
    .from("platform_accounts").select("id").eq("workspace_id", workspaceId).eq("status", "active");

  if (!accounts || accounts.length === 0) {
    return { ready: false, daysCollected: 0, daysNeeded: MIN_DAYS_REQUIRED, patterns: [] };
  }

  const { data: campaignRows } = await supabase
    .from("campaign_entities").select("external_id")
    .in("platform_account_id", accounts.map((a) => a.id)).eq("kind", "campaign");

  if (!campaignRows || campaignRows.length === 0) {
    return { ready: false, daysCollected: 0, daysNeeded: MIN_DAYS_REQUIRED, patterns: [] };
  }

  const { data: snapshots } = await supabase
    .from("metric_snapshots").select("entity_id, metric_key, value, captured_at")
    .eq("workspace_id", workspaceId).eq("source_window", "daily").eq("metric_key", "ctr")
    .in("entity_id", campaignRows.map((c) => c.external_id));

  // Real count of distinct real calendar days with data — not sync
  // attempts, not rows, actual distinct days, since that's what the
  // statistical validity genuinely depends on.
  const uniqueDays = new Set((snapshots ?? []).map((s) => s.captured_at.slice(0, 10)));
  const daysCollected = uniqueDays.size;

  if (daysCollected < MIN_DAYS_REQUIRED) {
    return { ready: false, daysCollected, daysNeeded: MIN_DAYS_REQUIRED, patterns: [] };
  }

  // Account-wide average CTR (one value per real day, not per row —
  // multiple campaigns synced on the same day get averaged together
  // for that day first, so a day with more campaigns doesn't silently
  // dominate the account average).
  const ctrByDay = new Map<string, number[]>();
  for (const s of snapshots ?? []) {
    const day = s.captured_at.slice(0, 10);
    if (!ctrByDay.has(day)) ctrByDay.set(day, []);
    ctrByDay.get(day)!.push(s.value);
  }
  const dailyAverages = Array.from(ctrByDay.entries()).map(([day, values]) => ({
    day, avgCtr: values.reduce((a, b) => a + b, 0) / values.length,
  }));
  const accountAvgCtr = dailyAverages.reduce((sum, d) => sum + d.avgCtr, 0) / dailyAverages.length;

  // Group by real day-of-week, requiring at least 2 real occurrences
  // of that specific weekday before it's eligible to be called a
  // pattern at all — one occurrence is a data point, not a pattern.
  const byWeekday = new Map<number, number[]>();
  for (const d of dailyAverages) {
    const weekday = new Date(d.day + "T00:00:00Z").getUTCDay();
    if (!byWeekday.has(weekday)) byWeekday.set(weekday, []);
    byWeekday.get(weekday)!.push(d.avgCtr);
  }

  const patterns: PatternResult["patterns"] = [];
  for (const [weekday, values] of byWeekday.entries()) {
    if (values.length < 2) continue; // real minimum — a single occurrence isn't a pattern
    const avgCtr = values.reduce((a, b) => a + b, 0) / values.length;
    if (Math.abs(avgCtr - accountAvgCtr) / accountAvgCtr > 0.2) { // real, disclosed 20% deviation threshold
      patterns.push({ dayOfWeek: DAY_NAMES[weekday], avgCtr: Number(avgCtr.toFixed(2)), accountAvgCtr: Number(accountAvgCtr.toFixed(2)), occurrences: values.length });
    }
  }

  return { ready: true, daysCollected, daysNeeded: MIN_DAYS_REQUIRED, patterns };
}

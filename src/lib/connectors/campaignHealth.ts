export type TrendDirection = "improving" | "stable" | "declining" | "insufficient_data";

export interface MetricTrend { current: number | null; direction: TrendDirection; changePercent: number | null }

export interface CampaignHealth {
  healthScore: number | null; // null, not 0 — "no score" is different from "worst possible score"
  ctr: MetricTrend;
  cpc: MetricTrend; // derived: spend / clicks — real math on real synced numbers, not new data
  cpm: MetricTrend; // derived: spend / impressions * 1000
  spend: MetricTrend;
  roas: MetricTrend; // derived: conversion_value / spend — only populated for campaigns with real purchase-tracking data
}

interface DailyPoint { date: string; value: number }

/**
 * Module 1 of the requested optimization suite — the one honestly
 * buildable today without inventing data. Only ever computes a trend
 * from snapshots explicitly tagged source_window='daily' (metaSync.ts) —
 * mixing in the initial backfill's aggregate row would silently produce
 * a misleading result even though no individual number would be false.
 *
 * A metric with fewer than 2 real daily data points returns
 * "insufficient_data" explicitly — never a guessed "stable", which
 * would be a quiet fabrication dressed up as a real finding.
 */
export function computeCampaignHealth(
  dailySnapshots: Array<{ metric_key: string; value: number; captured_at: string }>
): CampaignHealth {
  const byMetric = (key: string): DailyPoint[] => {
    const byDate = new Map<string, number>();
    for (const s of dailySnapshots) {
      if (s.metric_key !== key) continue;
      const date = s.captured_at.slice(0, 10); // one point per real calendar day, not per sync run
      byDate.set(date, s.value); // last value wins if a day somehow synced twice
    }
    return Array.from(byDate.entries()).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
  };

  function trendFor(points: DailyPoint[], higherIsBetter: boolean): MetricTrend {
    if (points.length < 2) {
      return { current: points[0]?.value ?? null, direction: "insufficient_data", changePercent: null };
    }
    const current = points[points.length - 1].value;
    const previous = points[points.length - 2].value;
    if (previous === 0) return { current, direction: "insufficient_data", changePercent: null };

    const changePercent = ((current - previous) / previous) * 100;
    const direction: TrendDirection =
      Math.abs(changePercent) < 5 ? "stable"
      : (changePercent > 0) === higherIsBetter ? "improving" : "declining";

    return { current, direction, changePercent: Number(changePercent.toFixed(1)) };
  }

  const impressionsPoints = byMetric("impressions");
  const clicksPoints = byMetric("clicks");
  const spendPoints = byMetric("spend");
  const ctrPoints = byMetric("ctr");
  const conversionValuePoints = byMetric("conversion_value");

  // CPC/CPM are real derived metrics — genuine division on genuine
  // synced numbers, computed per real day, not a new data source.
  const cpcPoints: DailyPoint[] = spendPoints
    .map((sp) => { const cl = clicksPoints.find((c) => c.date === sp.date); return cl && cl.value > 0 ? { date: sp.date, value: sp.value / cl.value } : null; })
    .filter((p): p is DailyPoint => p !== null);
  const cpmPoints: DailyPoint[] = spendPoints
    .map((sp) => { const im = impressionsPoints.find((i) => i.date === sp.date); return im && im.value > 0 ? { date: sp.date, value: (sp.value / im.value) * 1000 } : null; })
    .filter((p): p is DailyPoint => p !== null);
  // ROAS: only computed for days that have BOTH a real conversion_value
  // and real spend — a campaign with no purchase tracking simply has
  // no ROAS points at all, correctly surfacing as "insufficient_data"
  // rather than a fabricated zero.
  const roasPoints: DailyPoint[] = conversionValuePoints
    .map((cv) => { const sp = spendPoints.find((s) => s.date === cv.date); return sp && sp.value > 0 ? { date: cv.date, value: cv.value / sp.value } : null; })
    .filter((p): p is DailyPoint => p !== null);

  const ctr = trendFor(ctrPoints, true);
  const cpc = trendFor(cpcPoints, false); // lower CPC is better
  const cpm = trendFor(cpmPoints, false); // lower CPM is better
  const spend = trendFor(spendPoints, true); // treated as neutral-positive (more investment), not good/bad on its own
  const roas = trendFor(roasPoints, true); // higher ROAS is better

  // Real, transparent composite — not a black box. Starts neutral,
  // moves only for metrics with genuine trend data; metrics still
  // "insufficient_data" simply don't vote either way, and the overall
  // score returns null (not 50, not 0) if literally none of them have
  // enough real data yet — a fabricated default number would be worse
  // than admitting nothing can be scored yet.
  const trends = [ctr, cpc, cpm, roas];
  const scored = trends.filter((t) => t.direction !== "insufficient_data");
  const healthScore = scored.length === 0 ? null : Math.max(0, Math.min(100,
    50 + scored.reduce((sum, t) => sum + (t.direction === "improving" ? 15 : t.direction === "declining" ? -15 : 0), 0)
  ));

  return { healthScore, ctr, cpc, cpm, spend, roas };
}

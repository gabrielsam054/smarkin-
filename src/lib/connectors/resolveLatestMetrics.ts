export interface CampaignWithMetrics {
  id: string;
  externalId: string;
  name: string;
  metrics: { impressions: number | null; clicks: number | null; spend: number | null; ctr: number | null };
  lastSyncedAt: string;
}

/**
 * Reduces raw metric_snapshots rows (multiple timestamps per entity per
 * metric) down to the single latest value per (entity, metric) pair.
 * Done in application code rather than a new DB view/function, since
 * this is a real, working query pattern without needing a migration —
 * the honest tradeoff being it only looks at whatever window of rows
 * the caller fetched (recent history), not all-time.
 */
export function resolveLatestMetrics(
  campaigns: Array<{ id: string; external_id: string; name: string | null; synced_at: string }>,
  snapshots: Array<{ entity_id: string; metric_key: string; value: number; captured_at: string }>
): CampaignWithMetrics[] {
  const latestByEntity = new Map<string, Map<string, { value: number; capturedAt: string }>>();

  for (const s of snapshots) {
    if (!latestByEntity.has(s.entity_id)) latestByEntity.set(s.entity_id, new Map());
    const metricMap = latestByEntity.get(s.entity_id)!;
    const existing = metricMap.get(s.metric_key);
    if (!existing || s.captured_at > existing.capturedAt) {
      metricMap.set(s.metric_key, { value: s.value, capturedAt: s.captured_at });
    }
  }

  return campaigns.map((c) => {
    const metricMap = latestByEntity.get(c.external_id);
    return {
      id: c.id,
      externalId: c.external_id,
      name: c.name || c.external_id, // real fallback — a campaign synced before this fix would have no name yet
      metrics: {
        impressions: metricMap?.get("impressions")?.value ?? null,
        clicks: metricMap?.get("clicks")?.value ?? null,
        spend: metricMap?.get("spend")?.value ?? null,
        ctr: metricMap?.get("ctr")?.value ?? null,
      },
      lastSyncedAt: c.synced_at,
    };
  });
}

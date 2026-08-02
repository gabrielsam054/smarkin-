import { traceStore } from "./traceStore";

export interface PerformanceMetrics {
  averageExecutionTime: number | null;
  slowestService: { serviceId: string; duration: number } | null;
  fastestService: { serviceId: string; duration: number } | null;
  cacheHitRate: number | null;
  averageCacheLookup: number | null;
  averagePipelineDuration: number | null;
  totalExecutionsObserved: number;
}

// Computed on read, not maintained incrementally — simpler, correct by
// construction, and there's no real-time-update requirement to justify the
// added complexity of incremental aggregation ("no dashboards" per scope).
export function getPerformanceMetrics(): PerformanceMetrics {
  const traces = traceStore.getAll().filter(t => t.status !== "running");

  if (traces.length === 0) {
    return {
      averageExecutionTime: null, slowestService: null, fastestService: null,
      cacheHitRate: null, averageCacheLookup: null, averagePipelineDuration: null,
      totalExecutionsObserved: 0,
    };
  }

  const durations = traces.map(t => t.totalDuration).filter((d): d is number => d !== null);
  const averageExecutionTime = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

  const allSteps = traces.flatMap(t => Object.values(t.steps)).filter(s => s.duration !== null);
  let slowestService: { serviceId: string; duration: number } | null = null;
  let fastestService: { serviceId: string; duration: number } | null = null;
  for (const step of allSteps) {
    const duration = step.duration as number;
    if (!slowestService || duration > slowestService.duration) slowestService = { serviceId: step.serviceId, duration };
    if (!fastestService || duration < fastestService.duration) fastestService = { serviceId: step.serviceId, duration };
  }

  const cacheDecisions = traces.filter(t => t.cacheMetrics.hit !== null || t.cacheMetrics.miss !== null);
  const cacheHits = cacheDecisions.filter(t => t.cacheMetrics.hit).length;
  const cacheHitRate = cacheDecisions.length ? cacheHits / cacheDecisions.length : null;

  const readTimes = traces.map(t => t.cacheMetrics.readTime).filter((t): t is number => t !== null);
  const averageCacheLookup = readTimes.length ? readTimes.reduce((a, b) => a + b, 0) / readTimes.length : null;

  return {
    averageExecutionTime, slowestService, fastestService,
    cacheHitRate, averageCacheLookup, averagePipelineDuration: averageExecutionTime,
    totalExecutionsObserved: traces.length,
  };
}

import { traceStore } from "./traceStore";
import { AuthenticatedIdentity } from "../../security/identity";
import { assertOwnsTrace } from "../../security/authorize";

export interface HealthReport {
  executionId: string;
  capability: string;
  status: "running" | "success" | "failure";
  duration: number | null;
  pipeline: string[];
  cacheStatus: string;
  servicesExecuted: { serviceId: string; status: string; duration: number | null }[];
  eventsPublished: number;
  commandsExecuted: number;
  warnings: string[];
  errors: string[];
}

// Available for debugging without exposing internal details to end users —
// this is a developer-facing shape, deliberately not wired into any
// end-user-facing route or component. requestingIdentity is required as of
// Phase 1.6 — a trace belongs to the user who created it, and this function
// fails safe (assertOwnsTrace throws) rather than silently returning
// another user's execution data.
export function getHealthReport(executionId: string, requestingIdentity: AuthenticatedIdentity): HealthReport | null {
  const trace = traceStore.get(executionId);
  if (!trace) return null;

  assertOwnsTrace(requestingIdentity, trace.userId); // throws AuthorizationError on mismatch

  const cacheStatus = trace.cacheMetrics.versionMismatch ? "version-mismatch"
    : trace.cacheMetrics.rebuild ? "rebuilt"
    : trace.cacheMetrics.hit ? "hit"
    : trace.cacheMetrics.miss ? "miss"
    : "unknown";

  const errors = Object.values(trace.steps)
    .filter(s => s.status === "failure")
    .map(s => `${s.serviceId}: ${s.errorMessage ?? "unknown error"}`);

  const warnings: string[] = [];
  for (const step of Object.values(trace.steps)) {
    if (step.status === "pending") warnings.push(`Service "${step.serviceId}" never ran — pipeline stopped before reaching it.`);
  }

  return {
    executionId: trace.executionId,
    capability: trace.capability,
    status: trace.status,
    duration: trace.totalDuration,
    pipeline: trace.pipeline,
    cacheStatus,
    servicesExecuted: Object.values(trace.steps).map(s => ({ serviceId: s.serviceId, status: s.status, duration: s.duration })),
    eventsPublished: trace.events.length,
    commandsExecuted: trace.commands.length,
    warnings,
    errors,
  };
}

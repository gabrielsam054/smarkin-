/**
 * Smarkin OS — TraceStore
 *
 * An abstraction, not just an in-memory map — Phase 1.5 ships
 * InMemoryTraceStore, but any future persistent implementation (Supabase,
 * Redis, whatever) satisfies the same TraceStore interface, so nothing
 * calling traceStore.* needs to change when that day comes.
 *
 * Deliberately excludes: persistence across restarts, cross-deploy queries,
 * dashboards. "Only expose the metrics" for Phase 1.5 means queryable by a
 * developer in the same process, not durable analytics — that's a real,
 * separate decision for later, not one this phase makes by default.
 */

export type ServiceStepStatus = "pending" | "running" | "success" | "failure";

export interface ServiceStepTrace {
  serviceId: string;
  status: ServiceStepStatus;
  startTime: number | null;
  endTime: number | null;
  duration: number | null;
  // Lightweight, generic summary of what the service returned — never the
  // full payload. Built by a shape-agnostic summarizer (diagnostics/summarize.ts)
  // so this file never needs to know what a Decision or a BusinessIntelligence
  // profile specifically look like.
  outputSummary?: Record<string, unknown>;
  errorMessage?: string;
}

export interface CacheMetrics {
  hit: boolean | null;
  miss: boolean | null;
  rebuild: boolean;
  versionMismatch: boolean;
  readTime: number | null;
  writeTime: number | null;
}

export interface CommandTrace {
  command: string;
  dispatchTime: number;
  completionTime: number | null;
  duration: number | null;
  success: boolean | null;
}

export interface EventTrace {
  event: string;
  timestamp: number;
  publisher?: string;
  subscriberCount: number;
}

export interface ExecutionTrace {
  executionId: string;
  userId: string;
  capability: string;
  pipeline: string[];
  startTime: number;
  endTime: number | null;
  totalDuration: number | null;
  status: "running" | "success" | "failure";
  steps: Record<string, ServiceStepTrace>;
  cacheMetrics: CacheMetrics;
  commands: CommandTrace[];
  events: EventTrace[];
}

export interface TraceStore {
  create(executionId: string, userId: string, capability: string, pipeline: string[]): void;
  get(executionId: string): ExecutionTrace | undefined;
  getAll(): ExecutionTrace[];
  updateStep(executionId: string, serviceId: string, update: Partial<ServiceStepTrace>): void;
  finish(executionId: string, status: "success" | "failure"): void;
  recordCacheMetric(executionId: string, update: Partial<CacheMetrics>): void;
  recordCommand(executionId: string, record: CommandTrace): void;
  recordEvent(executionId: string, record: EventTrace): void;
}

class InMemoryTraceStore implements TraceStore {
  private traces = new Map<string, ExecutionTrace>();

  create(executionId: string, userId: string, capability: string, pipeline: string[]): void {
    this.traces.set(executionId, {
      executionId,
      userId,
      capability,
      pipeline,
      startTime: Date.now(),
      endTime: null,
      totalDuration: null,
      status: "running",
      steps: Object.fromEntries(pipeline.map(serviceId => [
        serviceId,
        { serviceId, status: "pending", startTime: null, endTime: null, duration: null } as ServiceStepTrace,
      ])),
      cacheMetrics: { hit: null, miss: null, rebuild: false, versionMismatch: false, readTime: null, writeTime: null },
      commands: [],
      events: [],
    });
  }

  get(executionId: string): ExecutionTrace | undefined {
    return this.traces.get(executionId);
  }

  getAll(): ExecutionTrace[] {
    return [...this.traces.values()];
  }

  updateStep(executionId: string, serviceId: string, update: Partial<ServiceStepTrace>): void {
    const trace = this.traces.get(executionId);
    if (!trace) return; // a missing trace must never throw — diagnostics failures can't affect real execution
    trace.steps[serviceId] = { ...trace.steps[serviceId], ...update, serviceId };
  }

  finish(executionId: string, status: "success" | "failure"): void {
    const trace = this.traces.get(executionId);
    if (!trace) return;
    trace.endTime = Date.now();
    trace.totalDuration = trace.endTime - trace.startTime;
    trace.status = status;
  }

  recordCacheMetric(executionId: string, update: Partial<CacheMetrics>): void {
    const trace = this.traces.get(executionId);
    if (!trace) return;
    trace.cacheMetrics = { ...trace.cacheMetrics, ...update };
  }

  recordCommand(executionId: string, record: CommandTrace): void {
    const trace = this.traces.get(executionId);
    if (!trace) return;
    trace.commands.push(record);
  }

  recordEvent(executionId: string, record: EventTrace): void {
    const trace = this.traces.get(executionId);
    if (!trace) return;
    trace.events.push(record);
  }
}

export const traceStore: TraceStore = new InMemoryTraceStore();

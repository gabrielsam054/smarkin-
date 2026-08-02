/**
 * Smarkin OS — Extension Contract (SDK)
 *
 * Every future engine and every future capability implements SmarkinService.
 * This file is the entire "plugin API" — a new capability requires only:
 *   1. A service adapter satisfying this interface
 *   2. One registration call into serviceContainer.ts
 *   3. An entry in that capability's explicit pipeline (pipelineBuilder.ts)
 *
 * Nothing in this file contains marketing logic. It never will.
 */
import { BusinessIntelligenceProfile } from "../businessIntelligenceEngine";

export type ServiceType = "capability" | "engine";
export type MemoryAccess = "none" | "read" | "write" | "read-write";

// ── The universal request shape every Brain call must follow ──────────────────
export interface BrainRequest<TPayload = unknown> {
  capability: string;       // defaults to "advertising" if omitted — see smarkinBrain.ts
  userId: string;
  productName: string;      // common to every capability; Business Intelligence needs this regardless
  description?: string;
  businessType?: string;
  payload: TPayload;        // capability-specific fields live here, never inspected by the Brain itself
}

// ── Message Bus handle, injected into every service call ──────────────────────
export interface MessageBus {
  dispatch: <T = unknown>(command: string, payload: unknown) => Promise<T>;
  publish: (event: string, payload: unknown) => void;
}

// ── The context every service receives — consolidates what used to be
//    scattered parameters into one object ─────────────────────────────────────
export interface BrainContext {
  executionId: string;
  userId: string;
  capability: string;
  // Resolved once per Brain run, before any BI-dependent service executes.
  // null only until the pipeline reaches the point where it's populated —
  // services declaring requiresBusinessIntelligence: true never see null,
  // enforced by the Pipeline Builder's explicit ordering, not by each
  // service defensively checking.
  businessIntelligence: BusinessIntelligenceProfile | null;
  bus: MessageBus;
}

// ── The contract itself ─────────────────────────────────────────────────────────
export interface SmarkinService<TInput = unknown, TOutput = unknown> {
  serviceId: string;
  serviceType: ServiceType;
  version: string;

  // Validated metadata in Phase 1, not used to compute execution order —
  // the explicit pipeline in pipelineBuilder.ts does that. Kept here so a
  // future topological-sort implementation has correct data to work from
  // without any service needing to be touched when that day comes.
  dependsOn: string[];
  optionalDependsOn: string[];

  requiresBusinessIntelligence: boolean;
  requiresMemory: MemoryAccess;

  // Security extension points (Phase 1.6) — optional, additive. No service
  // registered today declares either, since none genuinely need to yet.
  requiredPermissions?: string[];
  resourceBudget?: { maxDurationMs?: number; maxTokens?: number; maxCostUnits?: number };

  execute(input: TInput, context: BrainContext): Promise<TOutput>;
}

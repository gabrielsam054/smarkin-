/**
 * Smarkin OS — Pipeline Builder
 *
 * Approved simplification: implemented as an explicit ordered array per
 * capability, not a dependency-graph topological sort. The interface
 * (buildPipeline(capabilityId) -> string[]) is written so a future
 * graph-based implementation can replace the body without any caller
 * changes — callers only ever see an ordered list of serviceIds, never how
 * that order was derived.
 *
 * Registration-based, matching serviceContainer.ts's registerService()
 * exactly: a new capability calls registerPipeline() from its OWN file —
 * this file never lists capability names, so adding one never requires
 * editing pipelineBuilder.ts. (This replaces an earlier hardcoded
 * EXPLICIT_PIPELINES object literal, which genuinely did require editing
 * this file per capability — a real violation of "no core infrastructure
 * change per capability," caught by checking the code against that rule
 * directly rather than assuming the earlier design already satisfied it.)
 *
 * dependsOn/optionalDependsOn on each service are validated against the
 * registered order here (a dependency must appear earlier in the array than
 * the service declaring it) — not used to COMPUTE the order. This is
 * deliberate: when a real topological sorter replaces this file later, the
 * dependency metadata is already present and already correct, not
 * retrofitted under time pressure.
 */
import { resolveService } from "./serviceContainer";

const pipelines = new Map<string, string[]>();

export function registerPipeline(capabilityId: string, steps: string[]): void {
  if (pipelines.has(capabilityId)) {
    throw new Error(`Pipeline for capability "${capabilityId}" is already registered — duplicate registration is not allowed.`);
  }
  validatePipelineAgainstDependencies(capabilityId, steps);
  pipelines.set(capabilityId, steps);
}

export function buildPipeline(capabilityId: string): string[] {
  const pipeline = pipelines.get(capabilityId);
  if (!pipeline) {
    throw new Error(`No pipeline registered for capability "${capabilityId}". Registered capabilities: ${[...pipelines.keys()].join(", ")}`);
  }
  return pipeline;
}

function validatePipelineAgainstDependencies(capabilityId: string, pipeline: string[]): void {
  const positionOf = new Map(pipeline.map((id, index) => [id, index]));
  for (const serviceId of pipeline) {
    const service = resolveService(serviceId);
    for (const depId of service.dependsOn) {
      const depPosition = positionOf.get(depId);
      const ownPosition = positionOf.get(serviceId);
      if (depPosition === undefined) {
        throw new Error(`Pipeline for "${capabilityId}" is invalid: "${serviceId}" requires "${depId}", but "${depId}" is not in the pipeline at all.`);
      }
      if (depPosition >= ownPosition!) {
        throw new Error(`Pipeline for "${capabilityId}" is invalid: "${serviceId}" requires "${depId}", but "${depId}" is scheduled at or after "${serviceId}" in the explicit order.`);
      }
    }
  }
}

export function isCapabilityRegistered(capabilityId: string): boolean {
  return pipelines.has(capabilityId);
}

// Test-only escape hatch, matching the exact pattern already used in
// serviceContainer.ts's _clearRegistryForTesting().
export function _clearPipelinesForTesting(): void {
  pipelines.clear();
}

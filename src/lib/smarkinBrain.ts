/**
 * Smarkin AI — Smarkin Brain (Phase 1: OS foundation, Phase 1.6: secured)
 *
 * This file used to contain the entire Advertising pipeline directly. It no
 * longer does — that sequence now lives in advertisingCapability.ts,
 * registered as this system's first capability. This file's job has
 * narrowed to exactly what an orchestrator should do and nothing more:
 * generate an execution ID, pass the request through the Security Gateway
 * (Phase 1.6), resolve the requested capability, ensure Business-
 * Intelligence-dependent capabilities get it, dispatch through the Message
 * Bus, and return whatever the capability produced.
 *
 * It contains zero marketing logic and, as of Phase 1.6, zero security
 * policy either — secureDispatch() owns that entirely. This file only
 * knows "a capability was requested, secure it, look it up, run it."
 *
 * Backward compatibility: SmarkinRequest and SmarkinResult are preserved as
 * type aliases so any existing import of these names keeps compiling
 * unchanged.
 */
import { randomUUID } from "crypto";
import { registerCommandHandler, messageBus } from "./brain/messageBus";
import { ensureServicesRegistered } from "./brain/registerServices";
import { resolveService } from "./brain/serviceContainer";
import { buildPipeline } from "./brain/pipelineBuilder";
import { BrainRequest, BrainContext } from "./brain/smarkinService";
import { AdvertisingPayload, AdvertisingResult } from "./brain/advertisingCapability";
import { traceStore } from "./brain/diagnostics/traceStore";
import { log } from "./brain/diagnostics/logger";
import { secureDispatch } from "./security/secureDispatch";

// ── Backward-compatible type aliases — unchanged shapes, just renamed at
//    the module boundary so existing imports of these two names keep working. ──
export type SmarkinRequest = AdvertisingPayload;
export type SmarkinResult = AdvertisingResult;
export type { BrainRequest };

ensureServicesRegistered();

let commandRegistered = false;
function ensureCommandRegistered(): void {
  if (commandRegistered) return;
  registerCommandHandler("ExecuteCapability", async (rawRequest) => {
    // By the time this handler runs, secureDispatch() has already
    // authenticated, authorized, validated, and rate-limited the request —
    // request.userId here is the REAL resolved identity, never the client's
    // original claim, because secureDispatch() overwrote it before calling
    // this handler.
    const request = rawRequest as BrainRequest;
    const capability = request.capability || "advertising";

    const service = resolveService(capability);
    const pipeline = buildPipeline(capability);

    const executionId = randomUUID();

    try {
      traceStore.create(executionId, request.userId, capability, pipeline);
    } catch (traceError) {
      console.error("[Brain] Trace creation failed (execution continues unaffected):", traceError);
    }

    messageBus.publish("capability.started", { executionId, capability });
    log("info", `Capability "${capability}" started`, { executionId, capability });

    const context: BrainContext = {
      executionId,
      userId: request.userId,
      capability,
      businessIntelligence: null,
      bus: messageBus,
    };

    let result: unknown;
    try {
      result = await service.execute(request.payload, context);
    } catch (err) {
      try {
        traceStore.finish(executionId, "failure");
      } catch (traceError) {
        console.error("[Brain] Trace finalization failed (error still propagates correctly):", traceError);
      }
      log("error", `Capability "${capability}" failed`, { executionId, capability, error: (err as Error).message });
      throw err;
    }

    try {
      traceStore.finish(executionId, "success");
    } catch (traceError) {
      console.error("[Brain] Trace finalization failed (real result still returned):", traceError);
    }

    messageBus.publish("capability.completed", { executionId, capability, pipeline });
    log("info", `Capability "${capability}" completed`, { executionId, capability });
    return result;
  });
  commandRegistered = true;
}

/**
 * The genuinely generic entry point — any future capability calls this with
 * its OWN payload/result types. This is what makes "no new capability
 * requires Brain changes" literally true: a future SEO capability calls
 * executeCapability<SeoPayload, SeoResult>({ capability: "seo", ... }),
 * not a copy-pasted or edited version of this function.
 */
export async function executeCapability<TPayload, TResult>(
  request: BrainRequest<TPayload>,
): Promise<TResult> {
  ensureCommandRegistered();
  const executionId = randomUUID();

  const outcome = await secureDispatch<TResult>(request, executionId, async (identity) => {
    // The one place a client-claimed userId gets overwritten with the real,
    // resolved identity — "never trust client-provided user IDs" as actual
    // code, not just a stated principle.
    const securedRequest: BrainRequest<TPayload> = { ...request, userId: identity.userId };
    return messageBus.dispatch<TResult>("ExecuteCapability", securedRequest);
  });

  if (!outcome.success) {
    // Sanitized message only — full detail already flows into the trace via
    // whatever failed inside dispatchFn, or was never computed at all if
    // the gateway rejected before dispatch.
    throw new Error(outcome.error.message);
  }

  return outcome.result;
}

/**
 * Backward-compatible, Advertising-specific convenience wrapper — every
 * existing caller of runSmarkinBrain() keeps working with zero changes.
 * New capabilities use executeCapability() directly instead of a parallel
 * function like this one; this wrapper exists ONLY because it predates the
 * generic version and removing it would break real callers.
 */
export async function runSmarkinBrain(request: BrainRequest<AdvertisingPayload>): Promise<AdvertisingResult> {
  return executeCapability<AdvertisingPayload, AdvertisingResult>(request);
}

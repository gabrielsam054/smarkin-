/**
 * Wraps a single service call with timing, status, and output-summary
 * recording. The one rule that matters most in this file: every diagnostics
 * operation (trace store writes, logging, summarizing) is wrapped in its
 * own try/catch that only logs and continues — NEVER around the actual
 * service call itself, which must execute and return/throw exactly as it
 * would with no instrumentation at all. A bug in this file must never be
 * able to change what Advertising (or any future capability) produces.
 */
import { traceStore } from "./traceStore";
import { summarizeOutput } from "./summarize";
import { SmarkinError } from "./errors";
import { log } from "./logger";

function safelyRecordDiagnostic(fn: () => void): void {
  try {
    fn();
  } catch (diagnosticError) {
    // A failure in diagnostics is itself worth knowing about, but it must
    // never propagate — logging it via the plain console, not the
    // structured logger, deliberately: if the structured logger itself is
    // what's broken, this is the one fallback that can't also fail the
    // same way.
    console.error("[TraceRecorder] Diagnostic recording failed (real execution unaffected):", diagnosticError);
  }
}

export async function recordStep<T>(
  executionId: string,
  capability: string,
  serviceId: string,
  pipelinePosition: number,
  fn: () => Promise<T>,
): Promise<T> {
  safelyRecordDiagnostic(() => {
    traceStore.updateStep(executionId, serviceId, { status: "running", startTime: Date.now() });
    log("info", `Service "${serviceId}" started`, { executionId, capability, service: serviceId });
  });

  let result: T;
  try {
    // The real call — nothing about this line is wrapped in a try/catch
    // that could swallow or alter its outcome.
    result = await fn();
  } catch (originalError) {
    const wrapped = new SmarkinError(
      `Service "${serviceId}" failed during capability "${capability}"`,
      { executionId, service: serviceId, capability, pipelinePosition },
      originalError,
    );
    safelyRecordDiagnostic(() => {
      const endTime = Date.now();
      const step = traceStore.get(executionId)?.steps[serviceId];
      const duration = step?.startTime ? endTime - step.startTime : null;
      traceStore.updateStep(executionId, serviceId, {
        status: "failure", endTime, duration,
        errorMessage: wrapped.message,
      });
      log("error", `Service "${serviceId}" failed`, { executionId, capability, service: serviceId, error: wrapped.message });
    });
    throw wrapped; // never swallowed — this is the one place execution genuinely stops, same as before instrumentation existed
  }

  safelyRecordDiagnostic(() => {
    const endTime = Date.now();
    const step = traceStore.get(executionId)?.steps[serviceId];
    const duration = step?.startTime ? endTime - step.startTime : null;
    traceStore.updateStep(executionId, serviceId, {
      status: "success", endTime, duration,
      outputSummary: summarizeOutput(result),
    });
    log("info", `Service "${serviceId}" completed`, { executionId, capability, service: serviceId, durationMs: duration });
  });

  return result;
}

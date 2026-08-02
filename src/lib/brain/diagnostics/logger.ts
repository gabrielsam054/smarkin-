/**
 * One function, replacing every ad-hoc console.log/console.error in the
 * brain layer. Emits a single JSON object per call — genuinely
 * machine-readable, not a human-readable string with metadata bolted on.
 *
 * Production Hardening Sprint, Priority 8: warn/error entries are also
 * persisted for admin visibility (fire-and-forget, via
 * operationalErrorStore.ts) — this function itself stays synchronous, so
 * none of its many existing call sites need to change to `await` it. The
 * persistence call is deliberately not awaited here.
 */
import { persistOperationalError } from "./operationalErrorStore";

export type LogLevel = "info" | "warn" | "error";

export interface LogMetadata {
  executionId?: string;
  capability?: string;
  service?: string;
  [key: string]: unknown;
}

export function log(level: LogLevel, message: string, metadata: LogMetadata = {}): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    executionId: metadata.executionId,
    capability: metadata.capability,
    service: metadata.service,
    metadata,
  };
  // Deliberately the only place in the diagnostics layer that touches
  // console — a single, consistent emission point, JSON-stringified so the
  // output is genuinely parseable by log tooling, not just readable by eye.
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);

  if (level !== "info") {
    // Fire-and-forget, deliberately unawaited — log() must never become
    // async just to support admin-facing persistence.
    void persistOperationalError(level, message, metadata);
  }
}

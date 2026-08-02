import { buildServiceRoleClient } from "../../supabase/serviceClient";
import { LogLevel, LogMetadata } from "./logger";

/**
 * Production Hardening Sprint, Priority 8. Fire-and-forget persistence for
 * warn/error-level log entries, so an admin can actually query past
 * failures instead of needing to have been watching Vercel's console at
 * the moment something broke. Same isolation discipline as auditLog.ts —
 * a failure to persist a log entry is itself only logged, never thrown,
 * never allowed to affect the real operation that triggered the log call
 * in the first place.
 */

export async function persistOperationalError(
  level: LogLevel,
  message: string,
  metadata: LogMetadata,
  category?: string,
): Promise<void> {
  if (level === "info") return; // only warn/error are persisted — info-level noise doesn't belong in an admin-facing failure view

  try {
    const client = buildServiceRoleClient();
    if (!client) {
      console.error("[OperationalErrors] No service role client available — entry not persisted, console log still stands.");
      return;
    }
    const { error } = await client.from("operational_errors").insert({
      level,
      message,
      category: category ?? null,
      execution_id: metadata.executionId ?? null,
      capability: metadata.capability ?? null,
      service: metadata.service ?? null,
      metadata,
    });
    if (error) {
      console.error("[OperationalErrors] Failed to persist entry (original log unaffected):", error.message);
    }
  } catch (err) {
    console.error("[OperationalErrors] Unexpected failure persisting entry (original log unaffected):", err);
  }
}

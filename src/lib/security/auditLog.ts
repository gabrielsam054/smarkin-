/**
 * Smarkin Security — Audit Logging
 *
 * "Who did what" — separate from Phase 1.5's diagnostics, which answer
 * "what happened technically." Writes are fire-and-forget: an audit-log
 * failure is logged and swallowed, matching the exact "diagnostic failures
 * can never affect real execution" isolation already proven in Phase 1.5's
 * recordStep().
 */
import { createClient } from "@/lib/supabase/server";

export interface AuditEntry {
  userId: string | null;
  capability: string;
  resource: string;
  action: string;
  result: "success" | "denied" | "error";
  executionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function recordAuditEntry(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("audit_log").insert({
      user_id: entry.userId,
      capability: entry.capability,
      resource: entry.resource,
      action: entry.action,
      result: entry.result,
      execution_id: entry.executionId,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
    });
    if (error) {
      console.error("[AuditLog] Failed to record entry (request unaffected):", error.message);
    }
  } catch (err) {
    console.error("[AuditLog] Unexpected failure recording entry (request unaffected):", err);
  }
}

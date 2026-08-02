/**
 * Smarkin Security — Authorization
 *
 * Defense in depth on top of existing RLS (business_intelligence_profiles,
 * decision_requests, decision_results, decision_outcomes all already have
 * user_id-scoped policies from Phases 1/1.5). This adds an explicit
 * application-level check BEFORE a query is even made, so a misconfigured
 * or accidentally-dropped RLS policy isn't the only thing standing between
 * a user and someone else's data.
 */
import { AuthenticatedIdentity } from "./identity";
import { AuthorizationError } from "./errors";

export type { AuthorizationError };

export function assertOwnsResource(
  identity: AuthenticatedIdentity,
  resourceUserId: string,
  resourceType: string,
): void {
  if (identity.userId !== resourceUserId) {
    throw new AuthorizationError(`User does not have access to this ${resourceType}.`);
  }
}

// Used by getHealthReport() (Phase 1.5) once traces carry userId (this phase) —
// a trace with no owner recorded (shouldn't happen post-Phase-1.6, but
// fails safe rather than silently allowing access) is treated as
// unauthorized, not as "no check needed."
export function assertOwnsTrace(identity: AuthenticatedIdentity, traceUserId: string | undefined): void {
  if (!traceUserId || identity.userId !== traceUserId) {
    throw new AuthorizationError("User does not have access to this execution trace.");
  }
}

/**
 * Smarkin Security — Secure Dispatch
 *
 * The one enforcement gate, sitting in front of the Brain's existing
 * dispatch. Everything after this file's work is the exact same
 * messageBus.dispatch("ExecuteCapability", ...) that existed before this
 * phase — Advertising's actual execution path is completely untouched;
 * it simply becomes unreachable without passing this gate first.
 *
 * Resource budgets are deliberately NOT a gateway check here — you cannot
 * validate duration/token usage before a service has run. checkResourceBudget()
 * remains available for a future service wrapper to call AFTER execution;
 * folding it into this pre-flight sequence would be dishonest about what a
 * budget check can actually verify before the fact.
 */
import { authProvider, AuthenticatedIdentity } from "./authProvider";
import { checkRequiredPermissions } from "./permissions";
import { validateBrainRequest } from "./validation";
import { rateLimiter, RATE_LIMIT_CONFIG } from "./rateLimiter";
import { recordAuditEntry } from "./auditLog";
import { toSafeErrorResponse, SafeErrorResponse } from "./secureError";
import { securityGateway, SecurityCheck } from "./securityGateway";
import { AuthenticationError } from "./errors";

let gatewayConfigured = false;

function ensureGatewayConfigured(): void {
  if (gatewayConfigured) return;

  const authenticationCheck: SecurityCheck = {
    name: "authentication",
    async execute() {
      // authProvider resolves identity from the real session — the
      // request's own claimed userId is never read here, matching
      // "never trust client-provided user IDs" literally.
      try {
        await authProvider.authenticate();
        return { allowed: true };
      } catch {
        return { allowed: false, reason: "No authenticated session.", category: "authentication" };
      }
    },
  };

  const authorizationCheck: SecurityCheck = {
    name: "authorization",
    async execute(request, identity) {
      if (!identity) return { allowed: false, reason: "No identity resolved.", category: "authorization" };
      const req = request as { requiredPermissions?: string[] };
      const permissionResult = await checkRequiredPermissions(identity, req.requiredPermissions);
      if (!permissionResult.allowed) {
        return { allowed: false, reason: `Missing permission: ${permissionResult.missing}`, category: "authorization" };
      }
      return { allowed: true };
    },
  };

  const validationCheck: SecurityCheck = {
    name: "validation",
    async execute(request) {
      const result = validateBrainRequest(request);
      if (!result.valid) {
        return { allowed: false, reason: result.errors.map(e => `${e.field}: ${e.message}`).join("; "), category: "validation" };
      }
      return { allowed: true };
    },
  };

  const rateLimitCheck: SecurityCheck = {
    name: "rate_limit",
    async execute(_request, identity) {
      if (!identity) return { allowed: false, reason: "No identity to rate-limit against.", category: "rate_limit" };
      const result = await rateLimiter.checkLimit(identity.userId, "brainExecution", RATE_LIMIT_CONFIG.brainExecution);
      if (!result.allowed) {
        return { allowed: false, reason: `Rate limit exceeded, retry after ${result.retryAfterMs}ms.`, category: "rate_limit" };
      }
      return { allowed: true };
    },
  };

  // Fixed sequence, per the approved plan: Authentication, Authorization,
  // Validation, Rate Limit, in that order.
  securityGateway.register(authenticationCheck);
  securityGateway.register(authorizationCheck);
  securityGateway.register(validationCheck);
  securityGateway.register(rateLimitCheck);
  gatewayConfigured = true;
}

export interface SecureDispatchResult<T> {
  success: true;
  identity: AuthenticatedIdentity;
  result: T;
}
export interface SecureDispatchFailure {
  success: false;
  error: SafeErrorResponse;
}

export async function secureDispatch<T>(
  rawRequest: unknown,
  executionId: string,
  dispatchFn: (identity: AuthenticatedIdentity) => Promise<T>,
): Promise<SecureDispatchResult<T> | SecureDispatchFailure> {
  ensureGatewayConfigured();

  // Resolve real identity ONCE, here — never from the request's own claimed
  // userId. If this fails, the gateway's authentication check will also
  // fail, but resolving it here lets authorization/audit logging use the
  // real identity when it exists.
  let identity: AuthenticatedIdentity | null = null;
  try {
    identity = await authProvider.authenticate();
  } catch {
    identity = null;
  }

  const gatewayResult = await securityGateway.run(rawRequest, identity, executionId);

  if (!gatewayResult.allowed) {
    recordAuditEntry({
      userId: identity?.userId ?? null,
      capability: (rawRequest as { capability?: string })?.capability ?? "unknown",
      resource: "brain-execution",
      action: "execute",
      result: "denied",
      executionId,
    }); // fire-and-forget, never awaited before returning to the caller

    const category = gatewayResult.category as SafeErrorResponse["category"];
    return {
      success: false,
      error: { message: toSafeErrorResponse(new AuthenticationError(gatewayResult.reason), executionId).message, executionId, category },
    };
  }

  // identity is guaranteed non-null here — the authentication check above
  // would have failed the gateway otherwise.
  try {
    const result = await dispatchFn(identity!);
    recordAuditEntry({
      userId: identity!.userId, capability: (rawRequest as { capability?: string })?.capability ?? "advertising",
      resource: "brain-execution", action: "execute", result: "success", executionId,
    });
    return { success: true, identity: identity!, result };
  } catch (err) {
    recordAuditEntry({
      userId: identity!.userId, capability: (rawRequest as { capability?: string })?.capability ?? "advertising",
      resource: "brain-execution", action: "execute", result: "error", executionId,
    });
    const safe = toSafeErrorResponse(err, executionId);
    return { success: false, error: safe };
  }
}

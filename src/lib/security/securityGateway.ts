/**
 * Smarkin Security — Security Gateway
 *
 * The same shape as Phase 1's Pipeline Builder, applied to security checks
 * instead of engines: ordered steps, explicit sequence today, room to
 * evolve later, interface never changes for callers. Phase 1.6 registers
 * exactly five checks in a fixed order. A future PromptInjectionCheck or
 * AIContentSafetyCheck is one more register() call — zero changes to this
 * class, secureDispatch.ts, or the Brain.
 *
 * Fail-safe: stops at the first denial, matching "fail-safe behavior" from
 * the approved principles — never runs remaining checks against a request
 * already known to be denied.
 */
import { AuthenticatedIdentity } from "./identity";
import { messageBus } from "../brain/messageBus";

export type SecurityCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string; category: string };

export interface SecurityCheck {
  name: string;
  execute(request: unknown, identity: AuthenticatedIdentity | null, executionId: string): Promise<SecurityCheckResult>;
}

export class SecurityGateway {
  private checks: SecurityCheck[] = [];

  register(check: SecurityCheck): void {
    this.checks.push(check);
  }

  async run(
    request: unknown,
    identity: AuthenticatedIdentity | null,
    executionId: string,
  ): Promise<SecurityCheckResult> {
    for (const check of this.checks) {
      const result = await check.execute(request, identity, executionId);

      // Security events reuse the existing Message Bus — zero new plumbing,
      // same publish() already proven safe in Phase 1/1.5 (a listener
      // failure here can't break the gateway itself).
      messageBus.publish(result.allowed ? "security.check.passed" : "security.check.failed", {
        executionId, checkName: check.name, ...(!result.allowed ? { reason: result.reason, category: result.category } : {}),
      });

      if (!result.allowed) return result; // fail-safe: stop at the first denial
    }
    return { allowed: true };
  }
}

export const securityGateway = new SecurityGateway();

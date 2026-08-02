/**
 * Smarkin Security — Rate Limiting
 *
 * Interface-first, same honest-scope discipline as TraceStore in Phase 1.5.
 * As of the Production Hardening Sprint, the default export below is the
 * real, distributed SupabaseRateLimiter — not the in-memory one. The
 * in-memory implementation is still exported for tests, where a fast,
 * dependency-free limiter is the right choice and its serverless
 * multi-instance limitation doesn't apply inside a single test process.
 */
import { SupabaseRateLimiter } from "./supabaseRateLimiter";

export interface RateLimitConfig {
  max: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

export interface RateLimiter {
  checkLimit(key: string, action: string, config: RateLimitConfig): Promise<RateLimitResult>;
}

// Central configuration — the one place these numbers live. Changing a
// limit means editing this object, not hunting through business logic.
export const RATE_LIMIT_CONFIG: Record<string, RateLimitConfig> = {
  brainExecution: { max: 30, windowMs: 60_000 },
  businessIntelligenceRebuild: { max: 10, windowMs: 60_000 },
  cacheRefresh: { max: 10, windowMs: 60_000 },
  apiRequest: { max: 100, windowMs: 60_000 },
  authAttempt: { max: 5, windowMs: 60_000 },
};

export class InMemoryRateLimiter implements RateLimiter {
  // key -> action -> array of request timestamps within the current window
  private hits = new Map<string, number[]>();

  async checkLimit(key: string, action: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const compositeKey = `${key}:${action}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    const existing = this.hits.get(compositeKey) ?? [];
    const withinWindow = existing.filter(t => t > windowStart);

    if (withinWindow.length >= config.max) {
      const oldestInWindow = withinWindow[0];
      const retryAfterMs = oldestInWindow + config.windowMs - now;
      this.hits.set(compositeKey, withinWindow); // prune while we're here, even on rejection
      return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
    }

    withinWindow.push(now);
    this.hits.set(compositeKey, withinWindow);
    return { allowed: true };
  }

  // Test-only escape hatch, matching the same pattern already used in
  // serviceContainer.ts's _clearRegistryForTesting().
  _clearForTesting(): void {
    this.hits.clear();
  }
}

// Production Hardening Sprint, Priority 7 — the real, distributed
// implementation is now the default.
export const rateLimiter: RateLimiter = new SupabaseRateLimiter();

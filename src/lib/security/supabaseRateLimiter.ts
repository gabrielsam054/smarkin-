import { RateLimiter, RateLimitConfig, RateLimitResult } from "./rateLimiter";
import { buildServiceRoleClient } from "../supabase/serviceClient";

/**
 * Production Hardening Sprint, Priority 7. Same RateLimiter interface as
 * InMemoryRateLimiter — every caller (Security Gateway included) is
 * completely unaffected by which implementation is actually wired in.
 * This is the real, distributed-safe one: hits are counted in Postgres,
 * shared across every concurrent serverless instance, not per-process.
 *
 * Same service-role pattern already established in admin.ts — reused
 * rather than inventing a second convention for the same thing.
 *
 * Fail-open, deliberately: if the rate-limit check itself can't reach the
 * database (missing service key, transient network issue), the request is
 * ALLOWED rather than blocked. A rate limiter that can take down the
 * entire app when it can't reach its own storage would be a worse outcome
 * than temporarily having no rate limit — this mirrors the same
 * "diagnostics/persistence failures can't break real execution" principle
 * already applied elsewhere, extended here to a genuinely non-critical-path
 * check. Authorization and authentication still fail closed; this does not,
 * intentionally.
 */

export class SupabaseRateLimiter implements RateLimiter {
  async checkLimit(key: string, action: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const bucketKey = `${key}:${action}`;
    const client = buildServiceRoleClient();

    if (!client) {
      console.error("[SupabaseRateLimiter] No service role client available — failing open (request allowed) rather than blocking all traffic.");
      return { allowed: true };
    }

    const windowStart = new Date(Date.now() - config.windowMs).toISOString();

    const { count, error: countError } = await client
      .from("rate_limit_hits")
      .select("id", { count: "exact", head: true })
      .eq("bucket_key", bucketKey)
      .gte("hit_at", windowStart);

    if (countError) {
      console.error("[SupabaseRateLimiter] Count query failed — failing open:", countError.message);
      return { allowed: true };
    }

    const currentCount = count ?? 0;
    if (currentCount >= config.max) {
      // Oldest hit in the window determines when the caller can retry —
      // real data, not an estimate.
      const { data: oldest } = await client
        .from("rate_limit_hits")
        .select("hit_at")
        .eq("bucket_key", bucketKey)
        .gte("hit_at", windowStart)
        .order("hit_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const retryAfterMs = oldest
        ? Math.max(0, new Date(oldest.hit_at).getTime() + config.windowMs - Date.now())
        : config.windowMs;

      return { allowed: false, retryAfterMs };
    }

    const { error: insertError } = await client.from("rate_limit_hits").insert({ bucket_key: bucketKey });
    if (insertError) {
      // The check already passed; a failure to RECORD this hit means the
      // count will be slightly under-counted for the next check, not that
      // this request should be blocked. Logged, not thrown.
      console.error("[SupabaseRateLimiter] Failed to record hit (request unaffected):", insertError.message);
    }

    return { allowed: true };
  }
}

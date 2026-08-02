import { createClient as createServiceClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Production Hardening Sprint code-quality pass: this exact pattern
 * (service-role client, graceful null on missing key) was written
 * independently in supabaseRateLimiter.ts and operationalErrorStore.ts
 * before being extracted here — the sprint's own "remove duplicated logic"
 * requirement, applied to code written in this same sprint, not just
 * older code. admin.ts has its own local copy predating this sprint;
 * left alone rather than refactored, since touching it is out of this
 * sprint's stated scope ("do not redesign architecture").
 */
export function buildServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !svcKey) return null;
  return createServiceClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Smarkin AI — Server-Side Subscription Guard
 *
 * Smarkin is free for everyone. Every authenticated user gets full,
 * unlimited access to every feature — no plan checks, no usage limits,
 * no billing gate of any kind.
 *
 * This keeps the same exported shape (SubscriptionGuard, CanAnalyzeResult,
 * getSubscriptionGuard, getGuardForCurrentUser) that the rest of the app
 * already calls, so nothing else needs to change. If paid plans come back
 * later, the old plan/usage-limit logic is in git history — this file was
 * deliberately simplified rather than patched with a bypass flag, so
 * there's no dead code sitting here in the meantime.
 */
import { createClient } from "@/lib/supabase/server";
import { type PlanId, type GatedFeature } from "@/lib/billing";

export interface SubscriptionGuard {
  userId: string;
  planId: PlanId | null;
  isActive: boolean;
  isAdmin: boolean;
  expiresAt: Date | null;
  hasFeature: (feature: GatedFeature) => boolean;
  canAnalyze: () => Promise<CanAnalyzeResult>;
  incrementUsage: () => Promise<void>;
}

export interface CanAnalyzeResult {
  allowed: boolean;
  reason?: "no_subscription" | "expired" | "limit_reached" | "no_feature";
  usedCount?: number;
  limit?: number;
}

export async function getSubscriptionGuard(userId: string): Promise<SubscriptionGuard> {
  return {
    userId,
    planId:    "agency" as PlanId,   // highest tier for everyone — no plan differentiation while free
    isActive:  true,
    isAdmin:   false,
    expiresAt: null,
    hasFeature: () => true,
    canAnalyze: async () => ({ allowed: true }),
    incrementUsage: async () => { /* no usage limits — nothing to track */ },
  };
}

export async function getGuardForCurrentUser(): Promise<{ guard: SubscriptionGuard; userId: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const guard = await getSubscriptionGuard(user.id);
  return { guard, userId: user.id };
}

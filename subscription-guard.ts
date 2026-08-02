/**
 * Smarkin AI — Server-Side Subscription Guard
 * Admin users bypass all subscription checks (via service role DB check).
 */
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
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

const ANALYSIS_LIMITS: Record<PlanId, number | null> = {
  trial: 20, pro: null, agency: null,
};

const PLAN_FEATURES: Record<PlanId, GatedFeature[]> = {
  trial:  ["audience_intelligence","campaign_strategy","creative_studio","saved_reports","advanced_exports"],
  pro:    ["audience_intelligence","campaign_strategy","creative_studio","saved_reports","advanced_exports"],
  agency: ["audience_intelligence","campaign_strategy","creative_studio","saved_reports","advanced_exports","team_workspaces"],
};

function getServiceOrAnonClient() {
  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (svcKey) {
    return createServiceClient(url, svcKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return null;
}

export async function getSubscriptionGuard(userId: string): Promise<SubscriptionGuard> {
  const supabase = await createClient();

  // ── Step 1: Admin check via service role (bypasses RLS) ──────
  const svc = getServiceOrAnonClient();
  const adminClient = svc ?? supabase;

  const { data: adminRow } = await adminClient
    .from("admins")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  const isAdmin = !!adminRow;

  if (isAdmin) {
    return {
      userId,
      planId:    "agency" as PlanId,
      isActive:  true,
      isAdmin:   true,
      expiresAt: null,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      hasFeature: (_f: GatedFeature) => true,
      canAnalyze: async () => ({ allowed: true }),
      incrementUsage: async () => { /* admins don't consume quota */ },
    };
  }

  // ── Step 2: Regular subscription check ────────────────────────
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id, status, expires_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const now       = new Date();
  const planId    = sub?.plan_id as PlanId | null ?? null;
  const expiresAt = sub?.expires_at ? new Date(sub.expires_at) : null;
  const isActive  = !!sub && (expiresAt === null || expiresAt > now);

  const hasFeature = (feature: GatedFeature): boolean => {
    if (!isActive || !planId) return false;
    return PLAN_FEATURES[planId]?.includes(feature) ?? false;
  };

  const canAnalyze = async (): Promise<CanAnalyzeResult> => {
    if (!isActive || !planId) return { allowed: false, reason: "no_subscription" };
    if (expiresAt && expiresAt <= now) return { allowed: false, reason: "expired" };
    if (!hasFeature("audience_intelligence")) return { allowed: false, reason: "no_feature" };

    const limit = ANALYSIS_LIMITS[planId];
    if (limit === null) return { allowed: true };

    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const { data: usage } = await supabase
      .from("usage_tracking")
      .select("analyses")
      .eq("user_id", userId)
      .eq("billing_period", period)
      .maybeSingle();

    const usedCount = usage?.analyses ?? 0;
    if (usedCount >= limit) return { allowed: false, reason: "limit_reached", usedCount, limit };
    return { allowed: true, usedCount, limit };
  };

  const incrementUsage = async (): Promise<void> => {
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    await supabase.rpc("increment_usage", { p_user_id: userId, p_billing_period: period });
  };

  return { userId, planId, isActive, isAdmin: false, expiresAt, hasFeature, canAnalyze, incrementUsage };
}

export async function getGuardForCurrentUser(): Promise<{ guard: SubscriptionGuard; userId: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const guard = await getSubscriptionGuard(user.id);
  return { guard, userId: user.id };
}

/**
 * Smarkin AI — Module 8: Billing & Subscription Engine
 * Provider-agnostic architecture. Paystack is the first provider.
 * Adding Stripe later requires only a new provider adapter.
 */

// ── Plan Definitions ──────────────────────────────────────────

export type PlanId = "trial" | "pro" | "agency";
export type SubscriptionStatus = "active" | "expired" | "cancelled" | "past_due" | "pending";
export type PaymentStatus = "pending" | "success" | "failed" | "refunded";
export type BillingProvider = "paystack" | "stripe";

export interface Plan {
  id: PlanId;
  name: string;
  priceUsd: number;   // display price in USD (shown to users)
  priceGHS: number;   // charge price in GHS (sent to Paystack)
  billingCycle: "one_time" | "monthly";
  durationDays: number | null;
  features: string[];
  isPopular: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  trial: {
    id: "trial",
    name: "3-Day Access",
    priceUsd: 3.99,
    priceGHS: 59.99,       // charged in GHS via Paystack
    billingCycle: "one_time",
    durationDays: 3,
    isPopular: false,
    features: [
      "Unlimited Product Analyses",
      "Full Audience Intelligence Report",
      "Campaign Strategy Engine",
      "AI Creative Studio",
      "Unlimited Saved Reports",
      "PDF Export",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceUsd: 19.0,
    priceGHS: 285.00,      // charged in GHS via Paystack
    billingCycle: "monthly",
    durationDays: null,
    isPopular: true,
    features: [
      "Everything in 3-Day Access",
      "Unlimited monthly usage",
      "Priority support",
      "Faster report generation",
      "New feature access",
    ],
  },
  agency: {
    id: "agency",
    name: "Agency",
    priceUsd: 39.0,
    priceGHS: 585.00,      // charged in GHS via Paystack
    billingCycle: "monthly",
    durationDays: null,
    isPopular: false,
    features: [
      "Everything in Pro",
      "Team Workspaces",
      "Multiple Team Members",
      "Shared Projects",
      "White-label Reports",
      "Advanced Exports",
      "Future API Access",
      "Premium Support",
    ],
  },
};

// ── Subscription Types ────────────────────────────────────────

export interface Subscription {
  id: string;
  userId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  provider: BillingProvider;
  paymentReference: string | null;
  customerCode: string | null;
  subscriptionCode: string | null;
  startsAt: string;
  expiresAt: string | null;
  nextBillingAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  reference: string;
  status: PaymentStatus;
  provider: BillingProvider;
  planId: PlanId | null;
  createdAt: string;
}

// ── Paystack Types ────────────────────────────────────────────

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: "success" | "failed" | "abandoned";
    reference: string;
    amount: number; // in kobo/cents
    currency: string;
    customer: {
      email: string;
      customer_code: string;
    };
    metadata: Record<string, unknown>;
  };
}

// ── Feature Gates ─────────────────────────────────────────────

export type GatedFeature =
  | "audience_intelligence"
  | "campaign_strategy"
  | "creative_studio"
  | "saved_reports"
  | "advanced_exports"
  | "team_workspaces";

const PLAN_FEATURES: Record<PlanId, GatedFeature[]> = {
  trial: [
    "audience_intelligence",
    "campaign_strategy",
    "creative_studio",
    "saved_reports",
    "advanced_exports",
  ],
  pro: [
    "audience_intelligence",
    "campaign_strategy",
    "creative_studio",
    "saved_reports",
    "advanced_exports",
  ],
  agency: [
    "audience_intelligence",
    "campaign_strategy",
    "creative_studio",
    "saved_reports",
    "advanced_exports",
    "team_workspaces",
  ],
};

export function canAccess(
  subscription: Subscription | null,
  feature: GatedFeature
): boolean {
  if (!subscription) return false;
  if (subscription.status !== "active") return false;
  if (
    subscription.expiresAt &&
    new Date(subscription.expiresAt) < new Date()
  )
    return false;
  return PLAN_FEATURES[subscription.planId]?.includes(feature) ?? false;
}

// ── Days remaining ────────────────────────────────────────────

export function daysRemaining(subscription: Subscription | null): number | null {
  if (!subscription?.expiresAt) return null;
  const diff = new Date(subscription.expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ── Paystack helpers (GHS → pesewas) ─────────────────────────

/** Convert GHS cedis to pesewas (Paystack smallest unit for GHS) */
export function toPaystackAmount(ghs: number): number {
  return Math.round(ghs * 100);
}

export function formatPrice(usd: number): string {
  return `$${usd.toFixed(2).replace(/\.00$/, "")}`;
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft, CheckCircle, AlertCircle, Shield,
  Zap, BarChart2, Users, Download, Star, Lock
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { LogoutButton } from "@/components/shared/LogoutButton";
import { Badge } from "@/components/ui/Badge";
import { PlanCard } from "@/components/billing/PlanCard";
import { SubscriptionStatusCard } from "@/components/billing/SubscriptionStatusCard";
import { PaymentHistoryTable } from "@/components/billing/PaymentHistoryTable";
import { PLANS } from "@/lib/billing";
import type { Subscription, PaymentRecord, PlanId } from "@/lib/billing";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Billing & Plans — Smarkin AI" };

interface PageProps {
  searchParams: Promise<{ success?: string; error?: string; ref?: string }>;
}

// Feature comparison data
const FEATURE_ROWS = [
  { label: "Product Analyses",           icon: Zap,       trial: "Unlimited", pro: "Unlimited",  agency: "Unlimited"  },
  { label: "Audience Intelligence",      icon: BarChart2, trial: true,        pro: true,         agency: true         },
  { label: "Campaign Strategy Engine",   icon: Zap,       trial: true,        pro: true,         agency: true         },
  { label: "Saved Reports",              icon: Star,      trial: true,        pro: true,         agency: true         },
  { label: "PDF & CSV Export",           icon: Download,  trial: true,        pro: true,         agency: true         },
  { label: "Priority Support",           icon: Shield,    trial: false,       pro: true,         agency: true         },
  { label: "Team Workspaces",            icon: Users,     trial: false,       pro: false,        agency: true         },
  { label: "White-label Reports",        icon: Star,      trial: false,       pro: false,        agency: true         },
  { label: "API Access",                 icon: Zap,       trial: false,       pro: false,        agency: "Soon"       },
];

function CellValue({ value }: { value: boolean | string }) {
  if (value === true)  return <CheckCircle size={15} className="text-primary mx-auto" />;
  if (value === false) return <span className="text-text-muted/40 text-sm mx-auto block text-center">—</span>;
  return <span className="font-mono text-[10px] text-primary/80 mx-auto block text-center">{value}</span>;
}

export default async function BillingPage({ searchParams }: PageProps) {
  const params   = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: subRow }, { data: paymentRows }] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("user_id", user.id)
      .eq("status", "active").order("created_at", { ascending: false }).limit(1).single(),
    supabase.from("payment_history").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(20),
  ]);

  const subscription: Subscription | null = subRow ? {
    id: subRow.id, userId: subRow.user_id, planId: subRow.plan_id as PlanId,
    status: subRow.status, provider: subRow.provider,
    paymentReference: subRow.payment_reference, customerCode: subRow.customer_code,
    subscriptionCode: subRow.subscription_code, startsAt: subRow.starts_at,
    expiresAt: subRow.expires_at, nextBillingAt: subRow.next_billing_at,
    cancelledAt: subRow.cancelled_at, createdAt: subRow.created_at,
  } : null;

  const payments: PaymentRecord[] = (paymentRows ?? []).map((p) => ({
    id: p.id, userId: p.user_id, amount: p.amount, currency: p.currency,
    reference: p.reference, status: p.status, provider: p.provider,
    planId: p.plan_id as PlanId | null, createdAt: p.created_at,
  }));

  const planList      = Object.values(PLANS);
  const currentPlanId = subscription?.planId;
  const hasActive     = subscription?.status === "active";
  const planBadge     = hasActive ? (PLANS[subscription!.planId]?.name ?? "Active") : "Free";

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary hidden sm:block">{user.email}</span>
            <Badge variant={hasActive ? "green" : "muted"}>{planBadge}</Badge>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        {/* Breadcrumb */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-10 group"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          Dashboard
        </Link>

        {/* ── ALERTS ── */}
        {params.success === "1" && (
          <div className="flex items-center gap-3 bg-primary/8 border border-primary/25 rounded-xl px-5 py-4 mb-8">
            <CheckCircle size={16} className="text-primary flex-none" />
            <div>
              <p className="text-sm font-medium text-primary">Payment confirmed</p>
              <p className="text-xs text-primary/70 mt-0.5">Your plan is active. All features are now unlocked.</p>
            </div>
          </div>
        )}
        {params.error && (
          <div className="flex items-center gap-3 bg-destructive/8 border border-destructive/25 rounded-xl px-5 py-4 mb-8">
            <AlertCircle size={16} className="text-destructive flex-none" />
            <div>
              <p className="text-sm font-medium text-destructive">
                {params.error === "payment_failed"   ? "Payment declined"
                : params.error === "verification_failed" ? "Verification failed"
                : "Something went wrong"}
              </p>
              <p className="text-xs text-destructive/70 mt-0.5">
                {params.error === "payment_failed"
                  ? "Please try again or use a different card."
                  : params.error === "verification_failed"
                  ? "Contact support if you were charged. Include your reference number."
                  : "Please refresh and try again."}
              </p>
              {params.ref && (
                <p className="text-[10px] text-destructive/50 mt-1 font-mono">ref: {params.ref}</p>
              )}
            </div>
          </div>
        )}

        {/* ── PAGE HEADER ── */}
        <div className="mb-12">
          <p className="font-mono text-[10px] tracking-[3px] uppercase text-primary mb-3">Billing</p>
          <h1 className="text-4xl font-heading font-black text-text-primary leading-tight mb-3">
            Plans & Billing
          </h1>
          <p className="text-text-secondary max-w-xl">
            One plan unlocks everything. No seat fees, no usage limits on analyses.
          </p>
        </div>

        {/* ── CURRENT SUBSCRIPTION + FEATURE ACCESS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-16">
          <div className="lg:col-span-2">
            <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted mb-3">Your subscription</p>
            <SubscriptionStatusCard subscription={subscription} />
          </div>

          <div className="lg:col-span-3">
            <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted mb-3">Feature access</p>
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_repeat(3,_80px)] gap-0 px-5 py-3 border-b border-border bg-surface-2">
                <div />
                {planList.map((plan) => (
                  <div key={plan.id} className="text-center">
                    <p className={`font-mono text-[9px] uppercase tracking-[2px] font-bold ${
                      plan.id === "pro" ? "text-primary" :
                      plan.id === "agency" ? "text-secondary" : "text-text-muted"
                    }`}>{plan.name}</p>
                  </div>
                ))}
              </div>
              {FEATURE_ROWS.map((row, i) => {
                const Icon = row.icon;
                const values = [row.trial, row.pro, row.agency] as (boolean | string)[];
                return (
                  <div
                    key={row.label}
                    className={`grid grid-cols-[1fr_repeat(3,_80px)] gap-0 px-5 py-3 items-center ${
                      i < FEATURE_ROWS.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={12} className="text-text-muted flex-none" />
                      <span className="text-sm text-text-secondary">{row.label}</span>
                    </div>
                    {values.map((v, vi) => (
                      <div key={vi} className="flex justify-center">
                        <CellValue value={v} />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── PLAN CARDS ── */}
        <div className="mb-16" id="plans">
          <div className="text-center mb-10">
            <p className="font-mono text-[10px] uppercase tracking-[3px] text-primary mb-3">Pricing</p>
            <h2 className="text-3xl font-heading font-black text-text-primary mb-3">
              Choose your plan
            </h2>
            <p className="text-text-secondary text-sm max-w-md mx-auto">
              Start with 3-Day Access to explore all features risk-free, then upgrade when you&apos;re ready.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {planList.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={currentPlanId === plan.id && hasActive}
              />
            ))}
          </div>

          {/* Trust bar */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8">
            {[
              { icon: Shield, label: "256-bit SSL encryption" },
              { icon: Lock,   label: "No card data stored" },
              { icon: CheckCircle, label: "Verified by Paystack" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs text-text-muted">
                <Icon size={12} className="text-primary/60" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* ── PAYMENT HISTORY ── */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted mb-1">Transaction log</p>
              <h2 className="font-heading font-bold text-text-primary">Payment History</h2>
            </div>
            {payments.length > 0 && (
              <span className="font-mono text-[10px] text-text-muted">
                {payments.length} {payments.length === 1 ? "transaction" : "transactions"}
              </span>
            )}
          </div>
          <div className="bg-surface border border-border rounded-2xl p-6">
            <PaymentHistoryTable payments={payments} />
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] text-text-muted font-mono mt-10">
          Smarkin AI · Billing powered by Paystack · Questions? Contact support
        </p>
      </main>
    </div>
  );
}

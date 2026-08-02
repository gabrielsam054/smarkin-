"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, CheckCircle, AlertCircle, Clock, XCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PLANS, daysRemaining, formatPrice } from "@/lib/billing";
import { cancelSubscriptionAction } from "@/app/billing/actions";
import { cn } from "@/lib/utils";
import type { Subscription } from "@/lib/billing";

interface SubscriptionStatusCardProps {
  subscription: Subscription | null;
}

export function SubscriptionStatusCard({ subscription }: SubscriptionStatusCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const plan = subscription ? PLANS[subscription.planId] : null;
  const days = daysRemaining(subscription);

  const statusConfig = {
    active:    { Icon: CheckCircle, color: "text-primary",     bg: "bg-primary/10 border-primary/20",     dot: "bg-primary",     label: "Active"    },
    expired:   { Icon: XCircle,     color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", dot: "bg-destructive", label: "Expired"   },
    cancelled: { Icon: XCircle,     color: "text-text-muted",  bg: "bg-surface-2 border-border",           dot: "bg-text-muted",  label: "Cancelled" },
    past_due:  { Icon: AlertCircle, color: "text-amber",       bg: "bg-amber/10 border-amber/20",          dot: "bg-amber",       label: "Past Due"  },
    pending:   { Icon: Clock,       color: "text-amber",       bg: "bg-amber/10 border-amber/20",          dot: "bg-amber",       label: "Pending"   },
  } as const;

  const handleCancel = () => {
    startTransition(async () => {
      await cancelSubscriptionAction();
      setConfirming(false);
      router.refresh();
    });
  };

  // Empty state
  if (!subscription || !plan) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center">
            <Zap size={16} className="text-text-muted" />
          </div>
          <div>
            <p className="font-heading font-semibold text-text-primary text-sm">No active plan</p>
            <p className="text-xs text-text-muted mt-0.5">Unlock all features below</p>
          </div>
        </div>
        <div className="h-px bg-border" />
        <p className="text-xs text-text-secondary leading-relaxed">
          Start with 3-Day Access for $3.99 or go unlimited with Pro at $19/month.
        </p>
        <Button size="sm" asChild className="gap-2 w-full">
          <Link href="#plans"><Zap size={13} />See plans</Link>
        </Button>
      </div>
    );
  }

  const cfg = statusConfig[subscription.status] ?? statusConfig.active;
  const { Icon } = cfg;

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      {/* Status header */}
      <div className={cn("flex items-center justify-between px-5 py-4 border-b border-border", cfg.bg)}>
        <div className="flex items-center gap-2.5">
          <Icon size={15} className={cfg.color} />
          <span className={cn("text-sm font-heading font-semibold", cfg.color)}>{cfg.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", cfg.dot)} />
          <span className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted">
            {plan.name}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Price */}
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-heading font-bold text-text-primary">
            {formatPrice(plan.priceUsd)}
          </span>
          <span className="text-xs text-text-muted font-mono">
            {plan.billingCycle === "monthly" ? "/month" : "one-time"}
          </span>
        </div>

        {/* Days remaining bar */}
        {days !== null && plan.durationDays && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted">Access period</span>
              <span className={cn("font-mono text-[10px] font-bold", days <= 1 ? "text-destructive" : "text-primary")}>
                {days}d left
              </span>
            </div>
            <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-700",
                  days <= 1 ? "bg-destructive" : "bg-primary")}
                style={{ width: `${(days / plan.durationDays) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              label: "Started",
              value: new Date(subscription.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            },
            ...(subscription.expiresAt ? [{
              label: subscription.cancelledAt ? "Cancelled" : "Expires",
              value: new Date(subscription.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            }] : []),
            ...(subscription.nextBillingAt && !subscription.cancelledAt ? [{
              label: "Next billing",
              value: new Date(subscription.nextBillingAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            }] : []),
            {
              label: "Provider",
              value: subscription.provider.charAt(0).toUpperCase() + subscription.provider.slice(1),
            },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface-2 rounded-sm px-3 py-2">
              <p className="font-mono text-[8px] uppercase tracking-[2px] text-text-muted mb-0.5">{label}</p>
              <p className="text-xs font-mono text-text-primary">{value}</p>
            </div>
          ))}
        </div>

        {/* Payment ref */}
        {subscription.paymentReference && (
          <div className="flex items-center gap-2 bg-surface-2 rounded-sm px-3 py-2">
            <Shield size={10} className="text-primary flex-none" />
            <p className="font-mono text-[9px] text-text-muted truncate">
              {subscription.paymentReference}
            </p>
          </div>
        )}

        {/* Cancel flow */}
        {subscription.status === "active" && !subscription.cancelledAt && (
          <div className="pt-1 border-t border-border">
            {confirming ? (
              <div className="space-y-3">
                <p className="text-xs text-text-secondary leading-relaxed">
                  You&apos;ll retain access until your plan ends. This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isPending}
                    className="flex-1 text-xs py-2 rounded-sm bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                  >
                    {isPending ? "Cancelling…" : "Yes, cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="flex-1 text-xs py-2 rounded-sm bg-surface-2 border border-border text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Keep plan
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="text-xs text-text-muted hover:text-destructive transition-colors"
              >
                Cancel subscription
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

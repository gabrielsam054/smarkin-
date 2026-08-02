"use client";

import { useState, useTransition } from "react";
import { Check, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Plan, PlanId } from "@/lib/billing";
import { formatPrice } from "@/lib/billing";

interface PlanCardProps {
  plan: Plan;
  isCurrent?: boolean;
}

const ACCENT: Record<string, {
  border: string; glow: string; badge: string;
  btn: string; price: string; check: string;
}> = {
  trial: {
    border: "border-border hover:border-border-strong",
    glow:   "",
    badge:  "",
    btn:    "bg-surface-2 hover:bg-surface-3 text-text-primary border border-border-strong",
    price:  "text-text-primary",
    check:  "text-primary",
  },
  pro: {
    border: "border-primary/40",
    glow:   "shadow-[0_0_60px_rgba(34,197,94,0.12)]",
    badge:  "bg-primary text-black font-bold",
    btn:    "bg-primary hover:bg-primary/90 text-black font-bold shadow-[0_0_20px_rgba(34,197,94,0.35)]",
    price:  "text-primary",
    check:  "text-primary",
  },
  agency: {
    border: "border-secondary/30 hover:border-secondary/50",
    glow:   "shadow-[0_0_40px_rgba(59,130,246,0.08)]",
    badge:  "",
    btn:    "bg-secondary/15 hover:bg-secondary/25 text-secondary border border-secondary/40",
    price:  "text-secondary",
    check:  "text-secondary",
  },
};

export function PlanCard({ plan, isCurrent }: PlanCardProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const acc = ACCENT[plan.id] ?? ACCENT.trial;

  const handleCheckout = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/paystack/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: plan.id as PlanId }),
        });

        const data = await res.json() as { authorizationUrl?: string; error?: string };

        if (!res.ok || data.error) {
          setError(data.error ?? "Checkout failed. Please try again.");
          return;
        }

        if (data.authorizationUrl) {
          window.location.href = data.authorizationUrl;
        }
      } catch {
        setError("Could not connect to payment provider. Please try again.");
      }
    });
  };

  return (
    <div className={cn(
      "relative flex flex-col rounded-2xl border bg-surface transition-all duration-300 overflow-hidden",
      acc.border,
      acc.glow,
      plan.isPopular && "scale-[1.02]",
      isCurrent && "ring-1 ring-primary/30"
    )}>
      {/* Popular ribbon */}
      {plan.isPopular && (
        <div className={cn(
          "flex items-center justify-center gap-1.5 py-2.5",
          "text-[10px] font-mono font-bold uppercase tracking-[2px]",
          acc.badge
        )}>
          <Sparkles size={10} />
          Most Popular
        </div>
      )}

      <div className="p-7 flex flex-col flex-1">
        {/* Header */}
        <div className="mb-6">
          <p className="font-mono text-[9px] uppercase tracking-[3px] text-text-muted mb-3">
            {plan.billingCycle === "one_time" ? "One-time payment" : "Per month"}
          </p>
          <h3 className="text-lg font-heading font-bold text-text-primary mb-4">
            {plan.name}
          </h3>
          <div className="flex items-end gap-1.5">
            <span className={cn("text-5xl font-heading font-black leading-none", acc.price)}>
              {formatPrice(plan.priceUsd)}
            </span>
            {plan.billingCycle === "monthly" && (
              <span className="text-sm text-text-muted mb-1.5 font-mono">/mo</span>
            )}
          </div>
          {plan.durationDays && (
            <p className="text-xs text-text-muted mt-2 font-mono">
              Full access for {plan.durationDays} days
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border mb-5" />

        {/* Features */}
        <ul className="flex-1 space-y-3 mb-7">
          {plan.features.map((feat) => (
            <li key={feat} className="flex items-start gap-3">
              <Check size={13} className={cn("flex-none mt-0.5", acc.check)} />
              <span className="text-sm text-text-secondary leading-snug">{feat}</span>
            </li>
          ))}
        </ul>

        {/* Error */}
        {error && (
          <p className="text-xs text-destructive mb-3 text-center bg-destructive/10 border border-destructive/20 rounded-sm px-3 py-2">
            {error}
          </p>
        )}

        {/* CTA */}
        {isCurrent ? (
          <div className="flex items-center justify-center gap-2 py-3 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-medium">
            <Check size={14} />
            Current plan
          </div>
        ) : (
          <button
            type="button"
            onClick={handleCheckout}
            disabled={isPending}
            className={cn(
              "group flex items-center justify-center gap-2 w-full py-3.5 rounded-xl",
              "text-sm font-heading font-semibold transition-all duration-200 disabled:opacity-60",
              acc.btn
            )}
          >
            {isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <>
                {plan.id === "trial" ? "Start 3-Day Access"
                  : plan.id === "pro"   ? "Get Pro"
                  : "Get Agency"}
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

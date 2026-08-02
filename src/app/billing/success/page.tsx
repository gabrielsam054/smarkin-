import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckCircle, Zap, ArrowRight, BarChart2, Star } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { PLANS } from "@/lib/billing";
import type { PlanId } from "@/lib/billing";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Payment Successful — Smarkin AI" };

interface PageProps {
  searchParams: Promise<{ plan?: string }>;
}

async function SuccessContent({ planId }: { planId: string | undefined }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const plan = planId ? PLANS[planId as PlanId] : null;
  const planName = plan?.name ?? "Your plan";

  // Features unlocked by this plan
  const unlockedFeatures = [
    { icon: Zap,       label: "Audience Intelligence Reports" },
    { icon: BarChart2, label: "Campaign Strategy Engine"      },
    { icon: Star,      label: "AI Creative Studio"            },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-5 max-w-6xl mx-auto w-full">
        <Logo size="sm" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          {/* Success ring */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.2)]">
              <CheckCircle size={40} className="text-primary" />
            </div>
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[3px] text-primary mb-3">
            Payment confirmed
          </p>
          <h1 className="text-3xl font-heading font-black text-text-primary mb-3">
            Welcome to {planName}!
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed mb-8 max-w-sm mx-auto">
            Your payment was verified and your subscription is now active.
            All premium features are unlocked.
          </p>

          {/* Unlocked features */}
          <div className="bg-surface border border-primary/20 rounded-2xl p-5 mb-8 text-left">
            <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted mb-4">
              Now unlocked
            </p>
            <div className="space-y-3">
              {unlockedFeatures.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-none">
                    <Icon size={13} className="text-primary" />
                  </div>
                  <span className="text-sm text-text-secondary">{label}</span>
                  <CheckCircle size={12} className="text-primary ml-auto flex-none" />
                </div>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full gap-2" asChild>
              <Link href="/analysis/new">
                <Zap size={16} />
                Run your first analysis
                <ArrowRight size={14} />
              </Link>
            </Button>
            <Button variant="ghost" size="lg" className="w-full" asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>

          <p className="text-xs text-text-muted font-mono mt-8">
            A confirmation has been sent to {user.email}
          </p>
        </div>
      </main>
    </div>
  );
}

export default async function BillingSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <Suspense fallback={null}>
      <SuccessContent planId={params.plan} />
    </Suspense>
  );
}

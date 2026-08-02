import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Zap, Lock } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { LogoutButton } from "@/components/shared/LogoutButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { NewAnalysisForm } from "./NewAnalysisForm";
import { getSubscriptionGuard } from "@/lib/subscription-guard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "New Analysis — Smarkin AI" };

export default async function NewAnalysisPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Server-side gate
  const guard = await getSubscriptionGuard(user.id);
  const canRun = await guard.canAnalyze();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary hidden sm:block">{user.email}</span>
            <Badge variant={guard.isActive ? "green" : "muted"}>
              {guard.planId ? guard.planId.charAt(0).toUpperCase() + guard.planId.slice(1) : "Free"}
            </Badge>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-8 group">
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
          Back to Dashboard
        </Link>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Zap size={18} className="text-primary" />
            </div>
            <p className="font-mono text-xs tracking-[3px] uppercase text-primary">New Analysis</p>
          </div>
          <h1 className="text-3xl font-heading font-bold text-text-primary mb-2">
            Analyze Your Audience
          </h1>
          <p className="text-text-secondary leading-relaxed text-sm">
            Describe your product and we&apos;ll generate a complete audience intelligence report.
          </p>
        </div>

        {/* Subscription gate — show upgrade wall if no access */}
        {!canRun.allowed ? (
          <div className="bg-surface border border-border rounded-2xl p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-amber/10 border border-amber/25 flex items-center justify-center mx-auto mb-5">
              <Lock size={22} className="text-amber" />
            </div>
            <h2 className="text-xl font-heading font-bold text-text-primary mb-2">
              {canRun.reason === "limit_reached"
                ? `You've used all ${canRun.limit} analyses`
                : canRun.reason === "expired"
                ? "Your subscription has expired"
                : "Subscription required"}
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed mb-6 max-w-sm mx-auto">
              {canRun.reason === "limit_reached"
                ? `Upgrade to Pro for unlimited analyses. You've used ${canRun.usedCount} of ${canRun.limit}.`
                : canRun.reason === "expired"
                ? "Your plan has expired. Renew to continue running analyses."
                : "You need an active plan to run audience analyses."}
            </p>
            <Button size="lg" asChild className="gap-2">
              <Link href="/billing#plans"><Zap size={16} />View Plans</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Usage indicator for trial */}
            {canRun.limit !== null && canRun.limit !== undefined && (
              <div className="flex items-center justify-between bg-surface border border-border rounded-sm px-4 py-3 mb-6">
                <span className="text-xs text-text-secondary font-mono">
                  Analyses used: <span className="text-primary font-bold">{canRun.usedCount ?? 0}/{canRun.limit}</span>
                </span>
                <div className="w-32 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${((canRun.usedCount ?? 0) / canRun.limit) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="bg-surface border border-border rounded-2xl p-8 shadow-card">
              <NewAnalysisForm />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

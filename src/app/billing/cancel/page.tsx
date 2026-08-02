import Link from "next/link";
import { XCircle, ArrowLeft, RefreshCw, MessageCircle } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Payment Cancelled — Smarkin AI" };

interface PageProps {
  searchParams: Promise<{ reason?: string; ref?: string }>;
}

const REASON_COPY: Record<string, { title: string; description: string }> = {
  payment_failed: {
    title:       "Payment declined",
    description: "Your card was declined. Please try a different payment method or contact your bank.",
  },
  payment_abandoned: {
    title:       "Payment not completed",
    description: "It looks like you closed the payment window before completing the transaction.",
  },
  verification_error: {
    title:       "Verification failed",
    description: "We could not verify your payment. If you were charged, please contact support with your reference number.",
  },
  missing_reference: {
    title:       "Invalid payment link",
    description: "This payment link is missing required information. Please start the checkout again.",
  },
  invalid_plan: {
    title:       "Invalid plan",
    description: "The plan selected is no longer available. Please choose a different plan.",
  },
  default: {
    title:       "Payment not completed",
    description: "Something went wrong during checkout. No charge was made to your account.",
  },
};

export default async function BillingCancelPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const reason = params.reason ?? "default";
  const ref    = params.ref;
  const copy   = REASON_COPY[reason] ?? REASON_COPY.default;

  const showRef = ref && reason === "verification_error";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-5 max-w-6xl mx-auto w-full">
        <Logo size="sm" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          {/* Error icon */}
          <div className="w-20 h-20 rounded-full bg-destructive/10 border-2 border-destructive/25 flex items-center justify-center mx-auto mb-8">
            <XCircle size={36} className="text-destructive" />
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[3px] text-destructive/70 mb-3">
            Payment cancelled
          </p>
          <h1 className="text-2xl font-heading font-bold text-text-primary mb-3">
            {copy.title}
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed mb-6 max-w-sm mx-auto">
            {copy.description}
          </p>

          {/* Reference for support */}
          {showRef && (
            <div className="bg-surface border border-border rounded-xl px-4 py-3 mb-6 text-left">
              <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted mb-1">
                Reference number (share with support)
              </p>
              <p className="font-mono text-sm text-text-primary break-all">{ref}</p>
            </div>
          )}

          {/* Important: no charge notice */}
          <div className="bg-surface border border-border rounded-xl px-4 py-3 mb-8">
            <p className="text-xs text-text-muted">
              {reason === "verification_error"
                ? "If you see a charge on your statement, please contact us immediately."
                : "You have not been charged. Your card is safe."}
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full gap-2" asChild>
              <Link href="/billing#plans">
                <RefreshCw size={15} />
                Try again
              </Link>
            </Button>
            <Button variant="ghost" size="lg" className="w-full gap-2" asChild>
              <Link href="/dashboard">
                <ArrowLeft size={15} />
                Back to dashboard
              </Link>
            </Button>
          </div>

          {/* Support link */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-text-muted">
            <MessageCircle size={12} />
            <span>
              Need help?{" "}
              <Link href="mailto:support@smarkin.ai" className="text-primary hover:underline">
                Contact support
              </Link>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

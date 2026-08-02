import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { ConfidenceBadge } from "@/components/shared/ConfidenceBadge";

/**
 * UI/UX Presentation Sprint — pure redesign, no new data. Every field
 * here is a prop the caller already has from real, existing query
 * results; this component only decides how to present it.
 */
export interface HeroSummary {
  businessName: string;
  confidence: number;
  primaryCustomer: string | null;
  primaryOpportunity: string | null;
  recommendedCampaign: string;
  actionHref: string;
}

export function HeroCard({ summary }: { summary: HeroSummary }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/[0.06] via-surface to-surface p-8 sm:p-10">
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="relative flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wide mb-4">
        <Sparkles size={14} />
        AI Recommendation
      </div>

      <h1 className="relative text-3xl sm:text-4xl font-bold text-text-primary tracking-tight mb-6 max-w-2xl">
        {summary.businessName}
      </h1>

      <div className="relative grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-10 mb-8">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide mb-1.5">Confidence</p>
          <ConfidenceBadge score={summary.confidence} />
        </div>
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wide mb-1.5">Primary Customer</p>
          <p className="text-sm font-semibold text-text-primary">{summary.primaryCustomer ?? "Not yet identified"}</p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs text-text-muted uppercase tracking-wide mb-1.5">Recommended Campaign</p>
          <p className="text-sm font-semibold text-text-primary">{summary.recommendedCampaign}</p>
        </div>
      </div>

      {summary.primaryOpportunity && (
        <p className="relative text-base text-text-secondary max-w-2xl mb-8 leading-relaxed">
          {summary.primaryOpportunity}
        </p>
      )}

      <Link
        href={summary.actionHref}
        className="relative inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold rounded-full px-6 py-3 hover:bg-primary-dim transition-colors shadow-green-btn"
      >
        Generate Campaign
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}

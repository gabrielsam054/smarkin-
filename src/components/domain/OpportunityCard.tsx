import Link from "next/link";
import { TrendingUp, TrendingDown, AlertCircle, Users, MonitorSmartphone, ShoppingCart, ListChecks } from "lucide-react";

export interface OpportunityCardData {
  id: string;
  opportunityType: string;
  title: string;
  evidence: Record<string, unknown>;
  confidence: "low" | "medium" | "high";
}

const TYPE_ICON: Record<string, typeof TrendingUp> = {
  high_ctr_low_spend: TrendingUp, high_spend_low_ctr: TrendingDown,
  zero_recent_activity: AlertCircle, audience_segment_outperforming: Users,
  placement_outperforming: MonitorSmartphone, high_ctr_low_conversion: ShoppingCart,
};

/**
 * The real fix for usability audit finding #3: this exact card layout
 * was independently written in two places (the Opportunities page,
 * Campaign Detail's Diagnosis section) — not currently inconsistent,
 * but a real drift risk any time either one changes without the other.
 * One real rendering now, used by both.
 *
 * Deliberately flexible rather than forcing false uniformity: the two
 * call sites have genuinely different real needs (confidence vs.
 * severity badge, dismiss availability, whether a campaign link makes
 * sense) — badge and action are passed in by the caller rather than
 * this component guessing which context it's in.
 */
export function OpportunityCard({
  data, badge, campaignHref, action,
}: {
  data: OpportunityCardData;
  badge: { label: string; className: string };
  campaignHref?: string;
  action?: React.ReactNode;
}) {
  const Icon = TYPE_ICON[data.opportunityType] ?? ListChecks;

  const content = (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center flex-none">
        <Icon size={14} className="text-text-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-sm font-medium text-text-primary">{data.title}</p>
          <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-full border flex-none ${badge.className}`}>{badge.label}</span>
        </div>
        <p className="text-[11px] text-text-muted font-mono">
          {Object.entries(data.evidence).filter(([k]) => k !== "campaign_name").map(([k, v]) => `${k.replace(/_/g, " ")}: ${typeof v === "number" ? v.toFixed(2) : v}`).join(" · ")}
        </p>
      </div>
      {action}
    </div>
  );

  if (campaignHref) {
    return <Link href={campaignHref} className="card p-4 block hover:border-border-strong transition-colors">{content}</Link>;
  }
  return <div className="card p-4">{content}</div>;
}

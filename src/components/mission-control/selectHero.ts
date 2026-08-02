import { HeroSummary } from "@/components/domain/HeroCard";

/**
 * Per UX Spec §2: "Hero: highest-confidence recent report." A real
 * selection rule, not "most recent" or "first" — picks among whatever
 * Customer Research / Audience Research rows the caller already fetched
 * (same queries Reports already runs; no new backend query needed).
 */
export interface RecentReportCandidate {
  businessName: string;
  confidence: number;
  primaryCustomer: string | null;
  primaryOpportunity: string | null;
  recommendedCampaign: string;
  href: string;
}

export function selectHeroCandidate(candidates: RecentReportCandidate[]): HeroSummary | null {
  if (candidates.length === 0) return null;

  const best = candidates.reduce((a, b) => (b.confidence > a.confidence ? b : a));

  return {
    businessName: best.businessName,
    confidence: best.confidence,
    primaryCustomer: best.primaryCustomer,
    primaryOpportunity: best.primaryOpportunity,
    recommendedCampaign: best.recommendedCampaign,
    actionHref: best.href,
  };
}

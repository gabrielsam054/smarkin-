import { IndustryMarketingKnowledge } from "@/lib/industryKnowledge";
import { KnowledgeBadge } from "./KnowledgeBadge";
import { MessagingBlockGrid } from "./MessagingBlockGrid";
import { Explain } from "@/components/shared/Explain";

/**
 * The real deliverable of this feature: surfaces
 * AdvertisingResult.industryMarketingKnowledge — real backend data that
 * has had no UI since it shipped. `knowledge` is null for any business
 * outside Industry Pack coverage (most businesses, today — only
 * Consumer Electronics is built) — this MUST render nothing in that
 * case, never a fabricated or placeholder version of pack content.
 */
export function IndustryKnowledgeSection({ knowledge }: { knowledge: IndustryMarketingKnowledge | null }) {
  if (!knowledge) return null;

  const blocks = [
    knowledge.headlines[0] && { label: "Headline", value: knowledge.headlines[0] },
    knowledge.offers[0] && { label: "Offer", value: knowledge.offers[0] },
    knowledge.positioningIdeas[0] && { label: "Positioning", value: knowledge.positioningIdeas[0] },
    knowledge.callsToAction[0] && { label: "Call to Action", value: knowledge.callsToAction[0] },
  ].filter((b): b is { label: string; value: string } => Boolean(b));

  // Honest evidence count — the actual number of distinct marketing-
  // knowledge items this pack contributed, not a fabricated figure.
  const itemCount = knowledge.headlines.length + knowledge.offers.length + knowledge.positioningIdeas.length
    + knowledge.callsToAction.length + knowledge.valuePropositions.length
    + knowledge.riskReducers.length + knowledge.trustBuilders.length;

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
          Industry Knowledge
          <Explain
            claimLabel="Industry Knowledge"
            evidence={[{
              label: `${knowledge.industry} Industry Pack`,
              table: knowledge.source,
              rowsUsed: itemCount,
              matched: true,
            }]}
          />
        </h2>
        <KnowledgeBadge source={knowledge.source} confidence={knowledge.confidence} />
      </div>

      <MessagingBlockGrid blocks={blocks} />
    </section>
  );
}

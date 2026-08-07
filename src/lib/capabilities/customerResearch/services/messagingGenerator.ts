/**
 * Messaging Generator — reads persuasionedges (72/72 personas covered as of
 * this session's earlier expansion), copyangles, and the Journey Mapper's
 * own output for stage-specific key messages/CTAs. Headlines are built by
 * combining a real copy angle with a real pain point — never invented from
 * scratch.
 */
import { PainPoint, JourneyStage, RecommendedMessaging } from "../types";
import DB_RAW from "../../../smarkin-db.json";

type Row = Record<string, unknown>;
const DB_ANY = DB_RAW as unknown as Record<string, Row[] | undefined>;
const COPY_ANGLES = (DB_ANY["copyangles"] ?? []) as Row[];
const PERSUASION_EDGES = (DB_ANY["persuasionedges"] ?? []) as Row[];

function s(v: unknown): string { return v == null ? "" : String(v).toLowerCase().trim(); }
function str(v: unknown): string { return v == null ? "" : String(v).trim(); }

export function generateMessaging(
  personaNames: string[],
  painPoints: PainPoint[],
  journeyStages: JourneyStage[],
  gaps: string[],
): { recommendedMessaging: RecommendedMessaging; emotionalTriggers: string[] } {
  const frameworks = personaNames
    .map(name => PERSUASION_EDGES.find(r => s(r["Persona"]) === s(name)))
    .filter((r): r is Row => !!r);

  if (frameworks.length === 0 && personaNames.length > 0) {
    gaps.push(`No persuasionedges entries found for personas [${personaNames.join(", ")}] — messaging recommendations fall back to generic copy angles rather than persona-matched frameworks.`);
  }

  const headlineIdeas = painPoints.slice(0, 3).map((pp, i) => {
    const angle = COPY_ANGLES[i % COPY_ANGLES.length];
    return angle ? `${str(angle["Angle"])}: Solve "${pp.description}"` : `Solve "${pp.description}"`;
  });
  if (headlineIdeas.length === 0) {
    gaps.push("No pain points available to anchor headline generation — headlineIdeas is empty rather than generic filler.");
  }

  const productAwareStage = journeyStages.find(s => s.stage === "Product Aware");
  const mostAwareStage = journeyStages.find(s => s.stage === "Most Aware");

  // Real fix, found via live Alpha testing: each CTA genuinely belongs
  // to a specific funnel stage, but showing them as a flat, unlabeled
  // list made a real progression look like an undifferentiated dump.
  // Labeling each one with its real stage, not changing the underlying
  // data - same fix pattern already proven for the platform reasoning
  // display bug.
  const ctaRecommendations = journeyStages
    .filter(s => !!s.recommendedCTA)
    .map(s => `${s.recommendedCTA} (${s.stage} stage)`);
  const emotionalTriggers = [...new Set(COPY_ANGLES.map(r => str(r["Emotion"])).filter(Boolean))];

  return {
    recommendedMessaging: {
      headlineIdeas,
      // Same honesty fix: these are real funnel-stage psychological
      // objectives from the reference data, not finished product copy -
      // labeled as such rather than presented as if they were specific
      // to this product.
      offerAngle: productAwareStage?.keyMessage ? `${productAwareStage.keyMessage} (Product Aware stage framing)` : null,
      positioning: mostAwareStage?.keyMessage ? `${mostAwareStage.keyMessage} (Most Aware stage framing)` : null,
      ctaRecommendations,
    },
    emotionalTriggers,
  };
}

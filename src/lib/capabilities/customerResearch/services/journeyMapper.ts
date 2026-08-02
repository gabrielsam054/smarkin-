/**
 * Journey Mapper — reads customerJourneyDatabase (already used inside
 * businessIntelligenceEngine.ts's Journey Intelligence Service) directly,
 * mapping the standard four-stage awareness model (Eugene Schwartz's
 * framework, already the basis for this table's Stage column).
 */
import { BusinessIntelligenceProfile } from "../../../businessIntelligenceEngine";
import { JourneyStage } from "../types";
import DB_RAW from "../../../smarkin-db.json";

type Row = Record<string, unknown>;
const DB_ANY = DB_RAW as unknown as Record<string, Row[] | undefined>;
const JOURNEY_DB = (DB_ANY["customerJourneyDatabase"] ?? []) as Row[];
const CUSTOMER_QUESTIONS = (DB_ANY["customerquestions"] ?? []) as Row[];

function str(v: unknown): string { return v == null ? "" : String(v).trim(); }
function s(v: unknown): string { return str(v).toLowerCase(); }

const AWARENESS_STAGES = ["Problem Aware", "Solution Aware", "Product Aware", "Most Aware"] as const;

export function mapJourney(
  _profile: BusinessIntelligenceProfile,
  gaps: string[],
): { buyingStage: JourneyStage[]; customerAwareness: string[]; searchIntent: string[] } {
  const stages: JourneyStage[] = [];

  for (const stageName of AWARENESS_STAGES) {
    const row = JOURNEY_DB.find(r => s(r["Stage"]) === s(stageName));
    if (!row) {
      gaps.push(`No customerJourneyDatabase row found for stage "${stageName}" — that stage's messaging/CTA guidance is unavailable.`);
      stages.push({ stage: stageName, customerState: null, customerMindset: null, keyMessage: null, recommendedCTA: null });
      continue;
    }
    stages.push({
      stage: stageName,
      customerState: str(row["Customer State"]) || null,
      customerMindset: str(row["Customer Mindset"]) || null,
      keyMessage: str(row["Key Message"]) || null,
      recommendedCTA: str(row["Recommended CTA"]) || null,
    });
  }

  const customerAwareness = stages.filter(s => s.customerMindset).map(s => `${s.stage}: ${s.customerMindset}`);

  const searchIntent = [...new Set(CUSTOMER_QUESTIONS.map(r => str(r["Question"])).filter(Boolean))].slice(0, 20);
  if (searchIntent.length === 0) {
    gaps.push("customerquestions table produced no search-intent questions.");
  }

  return { buyingStage: stages, customerAwareness, searchIntent };
}

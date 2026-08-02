/**
 * Smarkin AI — Execution Brief Generator (Layer 4)
 *
 * "Execution happens only after the Decision Engine has selected the best
 * action" — this is that Layer 4. It never picks a channel or an action;
 * it only turns whatever Layer 2/3 already decided into something a person
 * could actually use to make an ad, an email, or a landing page.
 *
 * Deliberately channel-agnostic in its own logic — it reads `channel` off
 * the ChannelExecutionContext to decide which industry/persona signals to
 * use, but the output shape (headline, offer, CTA, format, benchmark
 * context) is the same regardless of which of the four adapters produced
 * the input. Adding a fifth channel adapter later requires zero changes here.
 */
import DB_RAW from "./smarkin-db.json";
import { DecisionResult } from "./decisionEngine";
import { BusinessIntelligenceProfile } from "./businessIntelligenceEngine";
import { ChannelExecutionContext } from "./channelAdapters";

type Row = Record<string, unknown>;
const DB_ANY = DB_RAW as unknown as Record<string, Row[] | undefined>;

const OFFERS = (DB_ANY["offerIntelligenceDatabase"] ?? []) as Row[];
const CREATIVE_INTEL = (DB_ANY["creativeIntelligenceDatabase"] ?? []) as Row[];
const COPY_ANGLES = (DB_ANY["copyangles"] ?? []) as Row[];
const BENCHMARKS = (DB_ANY["marketingBenchmarkDatabase"] ?? []) as Row[];
const PLAYBOOKS = (DB_ANY["campaignPlaybookDatabase"] ?? []) as Row[];

function s(v: unknown): string { return v == null ? "" : String(v).toLowerCase().trim(); }
function str(v: unknown): string { return v == null ? "" : String(v).trim(); }

export interface ExecutionBrief {
  taskName: string;
  headline: string;
  copyAngle: string;
  copyEmotion: string;
  offer: string;
  offerCta: string;
  recommendedFormat: string;
  hookType: string;
  benchmarkContext: string | null;
  campaignStructureNote: string | null;
  reasoningNotes: string[];
  gaps: string[];
}

function getTaskName(decision: DecisionResult): string {
  const primary = decision.primaryRecommendation;
  if (!primary) return "";
  return "actionName" in primary ? primary.actionName : "opportunity" in primary ? primary.opportunity : "";
}

function getTopPersonaPainPoint(businessIntelligence: BusinessIntelligenceProfile): string {
  // Same merge discipline as businessIntelligenceEngine.ts's getPersonaNames() —
  // the tag-overlap persona lookup and the Knowledge Graph are two separate
  // sources, and the graph one is frequently the only one with real data for
  // a specific product name (confirmed directly: "Whey Protein" returns zero
  // personas from the tag lookup but two real pain points from the graph).
  const tagBased = businessIntelligence.customerProfile.personas[0]?.painPoint;
  if (tagBased) return tagBased;
  return businessIntelligence.knowledgeGraphProfile.connectedPainPoints[0] ?? "";
}

// ── Offer — matched by industry, falling back to any active offer if no
//    industry match exists rather than returning nothing ─────────────────────
function selectOffer(industry: string, gaps: string[]): Row | null {
  const industryMatch = OFFERS.find(o => s(o["Status"]) === "active" && (
    s(o["Industry"]).includes(s(industry).split(",")[0].trim()) ||
    s(industry).includes(s(o["Industry"]).split("/")[0].trim())
  ));
  if (industryMatch) return industryMatch;
  gaps.push(`No offer matched industry "${industry}" specifically — offerIntelligenceDatabase has ${OFFERS.length} rows, may not cover every industry yet.`);
  return OFFERS.find(o => s(o["Status"]) === "active") ?? null;
}

// ── Creative format + hook type — matched by industry, same fallback logic ────
function selectCreative(industry: string, gaps: string[]): Row | null {
  const match = CREATIVE_INTEL.find(c => s(c["Best Industry"]).includes(s(industry).split(",")[0].trim()));
  if (match) return match;
  if (CREATIVE_INTEL.length === 0) {
    gaps.push("No Creative Intelligence data available at all.");
    return null;
  }
  gaps.push(`No Creative Intelligence match for industry "${industry}" — falling back to the first available row rather than inventing one.`);
  return CREATIVE_INTEL[0];
}

// ── Copy angle — rotated, not randomized, so the same input always produces
//    the same brief (important for a system meant to be explainable and
//    reproducible, not surprising on re-run) ──────────────────────────────────
function selectCopyAngle(taskName: string): Row {
  const index = taskName.length % COPY_ANGLES.length;
  return COPY_ANGLES[index];
}

// ── Benchmark — genuine data, honestly absent when it doesn't exist rather
//    than a fabricated number ─────────────────────────────────────────────────
function getBenchmarkContext(industry: string, objective: string): string | null {
  const match = BENCHMARKS.find(b =>
    s(b["Industry"]).includes(s(industry).split(",")[0].trim()) && s(b["Campaign Objective"]) === s(objective)
  ) ?? BENCHMARKS.find(b => s(b["Industry"]).includes(s(industry).split(",")[0].trim()));
  if (!match) return null;
  return `Typical for ${match["Industry"]}: CTR ${match["Average CTR (%)"]}%, CPC $${match["Average CPC ($)"]}, ROAS ${match["Average ROAS"]}x — use this to judge whether your results are on track, not as a guarantee.`;
}

function getCampaignStructureNote(industry: string): string | null {
  const match = PLAYBOOKS.find(p => s(p["Industry"]).includes(s(industry).split(",")[0].trim()));
  if (!match) return null;
  return `${match["Recommended Funnel"]} | Budget split: ${match["Budget Allocation"]} | Primary offer type: ${match["Primary Offer"]}`;
}

// ── Main export ────────────────────────────────────────────────────────────────
export function generateExecutionBrief(
  decision: DecisionResult,
  businessIntelligence: BusinessIntelligenceProfile,
  channelExecution: ChannelExecutionContext | null,
  industry: string,
  objective: string = "Sales",
): ExecutionBrief {
  const gaps: string[] = [];
  const taskName = getTaskName(decision);
  const painPoint = getTopPersonaPainPoint(businessIntelligence);

  if (!taskName) {
    gaps.push("No primary recommendation exists to build an execution brief around.");
  }

  const offer = selectOffer(industry, gaps);
  const creative = selectCreative(industry, gaps);
  const copyAngle = selectCopyAngle(taskName || industry);

  // The headline is the one place real specificity matters most — it uses
  // the persona's actual pain-point language when available, same
  // "creative signal specificity" principle from the earlier Creative
  // Concept Library work, not a generic template line.
  const headline = painPoint
    ? `${taskName ? `${taskName}: ` : ""}Stop dealing with "${painPoint}" — here's how.`
    : taskName || "No headline available — insufficient data to generate one honestly.";

  if (!painPoint) {
    gaps.push("No persona pain-point data available — headline falls back to a generic template rather than using specific customer language.");
  }

  const benchmarkContext = getBenchmarkContext(industry, objective);
  if (!benchmarkContext) gaps.push(`No Marketing Benchmark data for industry "${industry}" / objective "${objective}".`);

  const campaignStructureNote = getCampaignStructureNote(industry);
  if (!campaignStructureNote) gaps.push(`No Campaign Playbook found for industry "${industry}".`);

  const reasoningNotes: string[] = [
    channelExecution ? `Built for channel: ${channelExecution.channel} (${channelExecution.matched ? "matched" : "no data"})` : "No channel execution context available.",
    offer ? `Offer selected from offerIntelligenceDatabase: "${offer["Offer Name"]}"` : "No offer available — database gap.",
    creative ? `Creative format from creativeIntelligenceDatabase: "${creative["Creative Format"]}"` : "No creative format available — database gap.",
  ];

  return {
    taskName: taskName || "No task",
    headline,
    copyAngle: str(copyAngle?.["Angle"]),
    copyEmotion: str(copyAngle?.["Emotion"]),
    offer: offer ? str(offer["Offer Name"]) : "No offer available",
    offerCta: offer ? str(offer["Example CTA"]) : "",
    recommendedFormat: creative ? str(creative["Creative Format"]) : "No format available",
    hookType: creative ? str(creative["Hook Type"]) : "",
    benchmarkContext,
    campaignStructureNote,
    reasoningNotes,
    gaps,
  };
}

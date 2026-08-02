/**
 * Smarkin AI — Decision Engine
 *
 * "Given this business, what is the single highest-impact marketing action
 * they should take next, and why?"
 *
 * This is deliberately a SEPARATE module from matcher.ts. matcher.ts answers
 * "which Meta interests fit this product" — a Meta-specific question. This
 * module answers a channel-agnostic question: given a business's real
 * constraints (budget, time, team, experience), which CHANNEL deserves
 * attention first, and which SPECIFIC ACTION on that channel is highest
 * priority. Meta Ads is just one of thirteen possible channel outputs here,
 * chosen only when the evidence says it's the right one — never the default.
 *
 * Same "database decides" discipline as the rest of the engine: this file
 * never invents an action or a channel score. Every recommendation traces
 * back to a real row in channelSuitabilityDatabase, marketingActionsDatabase,
 * or marketingOpportunityDatabase.
 */
import DB_RAW from "./smarkin-db.json";
import { stringConfidenceToScore } from "./confidence";

type Row = Record<string, unknown>;
const DB_ANY = DB_RAW as unknown as Record<string, Row[] | undefined>;

const CHANNEL_SUITABILITY = (DB_ANY["channelSuitabilityDatabase"]  ?? []) as Row[];
const MARKETING_ACTIONS   = (DB_ANY["marketingActionsDatabase"]    ?? []) as Row[];
const MARKETING_OPPORTUNITY = (DB_ANY["marketingOpportunityDatabase"] ?? []) as Row[];
const BUSINESS_CONSTRAINTS  = (DB_ANY["businessConstraintsDatabase"]  ?? []) as Row[];

const CHANNELS = ["SEO","Email","Meta Ads","Google Ads","TikTok","LinkedIn","Pinterest","YouTube",
  "Influencer Marketing","Referral Marketing","Content Marketing","Google Business Profile","Organic Social"];

function s(v: unknown): string { return v == null ? "" : String(v).toLowerCase().trim(); }
function str(v: unknown): string { return v == null ? "" : String(v).trim(); }
function num(v: unknown): number { const n = Number(v); return Number.isFinite(n) ? n : 0; }

// ── Input: a business's real, stated constraints ──────────────────────────────
export interface BusinessProfile {
  industry: string;
  businessModel: string;          // "B2B" | "B2C" or a free description
  productType?: string;
  budgetRange: string;            // must roughly match a Business Constraints "Budget" value
  weeklyHours: string;            // must roughly match a Business Constraints "Weekly Hours" value
  teamSize: string;
  marketingExperience: string;    // "Beginner" | "Intermediate" | "Advanced"
  existingAssets: string;         // "None" | "Basic" | "Established" | "Advanced"
  customerAwareness?: string;
  businessStage: string;          // "Launch" | "Growth" | "Mature"
  goal: string;                   // "Sales" | "Leads" | "Bookings" | "Awareness" | etc.
}

export interface ChannelScore {
  channel: string;
  score: number;
}

export interface RecommendedAction {
  actionId: string;
  actionName: string;
  channel: string;
  category: string;
  priorityWeight: number;
  weeklyTimeRequired: string;
  monthlyBudgetRequired: string;
  difficulty: string;
  expectedImpact: string;
  expectedTimeUntilResults: string;
  reasoningNotes: string;
  evidenceSummary: string;
  whenToRecommend: string;
  commonMistakes: string;
  requiresPreviousActions: string;
  unlocksFutureActions: string;
  source: "Marketing Actions Database";
}

export interface RecommendedOpportunity {
  opportunityId: string;
  opportunity: string;
  priority: string;
  potentialRoi: string;
  timeRequired: string;
  budgetRequired: string;
  reasoning: string;
  evidence: string;
  source: "Marketing Opportunity Database";
}

export interface DecisionResult {
  matchedArchetype: {
    ruleId: string;
    industry: string;
    matchScore: number;          // how well the business profile matched this archetype, 0-100
  } | null;
  channelScores: ChannelScore[];
  recommendedChannel: string;
  secondChannel: string;
  thirdChannel: string;
  channelReasoning: string;
  channelEvidence: string;
  channelConfidence: string;
  // Additive, not a replacement — Production Hardening Sprint, Priority 6.
  // The string field above stays exactly as it was (real source data from
  // channelSuitabilityDatabase's own "Confidence" column, still used
  // wherever it already was). This numeric field is the SAME information,
  // converted via the one shared confidence model, so ConfidenceBadge/
  // ConfidenceRing can render Advertising's confidence without a special
  // case for a string type they don't otherwise handle.
  channelConfidenceScore: number;
  primaryRecommendation: RecommendedAction | RecommendedOpportunity | null;
  alternativeActions: RecommendedAction[];
  criticalOpportunities: RecommendedOpportunity[];  // "Critical" priority opportunities regardless of channel
  gaps: string[];  // honest reporting when no good match exists, instead of forcing one
}

// ── STEP 1: Find the closest-matching Channel Suitability archetype ───────────
// Scored by how many constraint fields match, not just industry — a business's
// budget and time constraints matter as much as its industry for this decision.
function matchArchetype(profile: BusinessProfile): { row: Row; score: number } | null {
  let best: { row: Row; score: number } | null = null;

  for (const row of CHANNEL_SUITABILITY) {
    let matched = 0;
    let total = 0;

    const checks: [string, string][] = [
      [s(row["Industry"]), s(profile.industry)],
      [s(row["Business Model"]), s(profile.businessModel)],
      [s(row["Budget Range"]), s(profile.budgetRange)],
      [s(row["Weekly Hours"]), s(profile.weeklyHours)],
      [s(row["Team Size"]), s(profile.teamSize)],
      [s(row["Marketing Experience"]), s(profile.marketingExperience)],
      [s(row["Existing Assets"]), s(profile.existingAssets)],
      [s(row["Business Stage"]), s(profile.businessStage)],
      [s(row["Goal"]), s(profile.goal)],
    ];

    for (const [dbVal, inputVal] of checks) {
      if (!inputVal) continue;
      total++;
      // Partial credit for substring overlap, full credit for exact match —
      // business descriptions rarely match the archetype text word-for-word.
      if (dbVal === inputVal) matched += 1;
      else if (dbVal.includes(inputVal) || inputVal.includes(dbVal)) matched += 0.6;
    }

    const score = total > 0 ? Math.round((matched / total) * 100) : 0;
    if (!best || score > best.score) best = { row, score };
  }

  return best;
}

import { MarketingReasoningSignal } from "./marketingReasoningEngine";

// ── STEP 2: Pull channel scores + recommendation from the matched archetype ───
// Accepts an OPTIONAL reasoning signal — when present, its channelAffinityAdjustments
// are added on top of the archetype's raw scores. This is the one integration
// point between the two engines: Marketing Reasoning Engine only ever nudges
// scores here, it never picks a channel itself. Omitting the signal entirely
// (the previous behavior) still works identically — this is additive, not a
// breaking change to any existing caller.
function getChannelScores(archetype: Row, reasoningSignal?: MarketingReasoningSignal): ChannelScore[] {
  const base = CHANNELS.map(ch => ({ channel: ch, score: num(archetype[ch]) }));
  if (!reasoningSignal) return base.sort((a, b) => b.score - a.score);

  const adjustmentMap = new Map(reasoningSignal.channelAffinityAdjustments.map(a => [a.channel, a.adjustment]));
  return base
    .map(c => ({ channel: c.channel, score: Math.min(100, c.score + (adjustmentMap.get(c.channel) ?? 0)) }))
    .sort((a, b) => b.score - a.score);
}

// ── STEP 3: Filter Marketing Actions to the recommended channel, ranked by
//    priority weight, respecting the business's stated constraints ────────────
function findActionsForChannel(channel: string, profile: BusinessProfile): RecommendedAction[] {
  const candidates = MARKETING_ACTIONS.filter(a => {
    const actionChannel = s(a["Marketing Channel"]);
    if (!actionChannel.includes(s(channel)) && !s(channel).includes(actionChannel)) return false;
    return true;
  });

  // Rank: prefer actions matching business stage and experience level, then by priority weight
  const scored = candidates.map(a => {
    let fit = num(a["Priority Weight"]);
    const stage = s(a["Best Business Stage"]);
    if (stage === "any" || stage.includes(s(profile.businessStage))) fit += 10;
    const exp = s(a["Experience Level"]);
    if (exp === s(profile.marketingExperience)) fit += 5;
    // Penalize actions requiring assets/experience clearly beyond a beginner/no-asset business
    if (s(profile.existingAssets) === "none" && s(a["Required Assets"]) !== "none") fit -= 15;
    return { row: a, fit };
  });

  scored.sort((a, b) => b.fit - a.fit);

  return scored.map(({ row }) => ({
    actionId: str(row["Action ID"]),
    actionName: str(row["Action Name"]),
    channel: str(row["Marketing Channel"]),
    category: str(row["Action Category"]),
    priorityWeight: num(row["Priority Weight"]),
    weeklyTimeRequired: str(row["Weekly Time Required"]),
    monthlyBudgetRequired: str(row["Monthly Budget Required"]),
    difficulty: str(row["Difficulty"]),
    expectedImpact: str(row["Expected Impact"]),
    expectedTimeUntilResults: str(row["Expected Time Until Results"]),
    reasoningNotes: str(row["Reasoning Notes"]),
    evidenceSummary: str(row["Evidence Summary"]),
    whenToRecommend: str(row["When To Recommend"]),
    commonMistakes: str(row["Common Mistakes"]),
    requiresPreviousActions: str(row["Requires Previous Actions"]),
    unlocksFutureActions: str(row["Unlocks Future Actions"]),
    source: "Marketing Actions Database",
  }));
}

// ── STEP 4: Critical-priority Opportunities are channel-agnostic and can
//    outrank a channel-specific action — e.g. "Collect Reviews" beats almost
//    any paid channel action for a business with no reviews yet ──────────────
// Precise Business Types matching — "Any local business" or "Any B2C business"
// must actually check the qualifier, not just match on the substring "any"
// (which appears in all of them and previously caused every opportunity to
// match every business regardless of the qualifier after "Any").
function opportunityAppliesToProfile(businessTypes: string, profile: BusinessProfile): boolean {
  const t = s(businessTypes);
  if (t === "any business" || t === "any") return true;
  if (t === "any b2c business") return s(profile.businessModel) === "b2c";
  if (t === "any b2b business") return s(profile.businessModel) === "b2b";
  if (t === "any local business") return s(profile.industry).includes("local") || s(profile.businessModel).includes("local");
  // Fallback for anything not matching the "Any X business" pattern above —
  // genuine substring match against industry/business model, never against "any" alone.
  return (t.includes(s(profile.industry)) && s(profile.industry).length > 0) ||
         (s(profile.industry).includes(t) && t.length > 3) ||
         t.includes(s(profile.businessModel));
}

function findCriticalOpportunities(profile: BusinessProfile): RecommendedOpportunity[] {
  return MARKETING_OPPORTUNITY
    .filter(o => s(o["Priority"]) === "critical")
    .filter(o => opportunityAppliesToProfile(str(o["Business Types"]), profile))
    .map(row => ({
      opportunityId: str(row["Opportunity ID"]),
      opportunity: str(row["Opportunity"]),
      priority: str(row["Priority"]),
      potentialRoi: str(row["Potential ROI"]),
      timeRequired: str(row["Time Required"]),
      budgetRequired: str(row["Budget Required"]),
      reasoning: str(row["Reasoning"]),
      evidence: str(row["Evidence"]),
      source: "Marketing Opportunity Database",
    }));
}

// ── Main export ────────────────────────────────────────────────────────────────
export function recommendNextAction(profile: BusinessProfile, reasoningSignal?: MarketingReasoningSignal): DecisionResult {
  const gaps: string[] = [];

  const matched = matchArchetype(profile);
  if (!matched || matched.score < 20) {
    gaps.push(
      `No Channel Suitability archetype matched this business profile well (best match: ${matched?.score ?? 0}%). ` +
      `Recommendation confidence is low — this business situation isn't well represented in the current 20 archetypes. ` +
      `Flag as a database gap: consider adding an archetype closer to Industry="${profile.industry}", Budget="${profile.budgetRange}", Stage="${profile.businessStage}".`
    );
  }

  const channelScores = matched ? getChannelScores(matched.row, reasoningSignal) : [];

  // The archetype's own "Recommended First Channel" is the baseline. If the
  // Marketing Reasoning Engine's adjustments changed which channel now scores
  // highest, that becomes the recommendation instead — and the change is
  // logged, not silent, since a channel switch driven by persona psychology
  // rather than raw business constraints is worth being able to see.
  const archetypeFirst = matched ? str(matched.row["Recommended First Channel"]) : "";
  const adjustedFirst = channelScores.length > 0 ? channelScores[0].channel : "";
  let recommendedChannel = archetypeFirst;
  let channelReasoning = matched ? str(matched.row["Reasoning"]) : "";

  if (reasoningSignal && adjustedFirst && archetypeFirst &&
      s(adjustedFirst) !== s(archetypeFirst.split("(")[0].split("/")[0].trim())) {
    recommendedChannel = adjustedFirst;
    channelReasoning = `Channel Suitability alone recommended "${archetypeFirst}", but Marketing Reasoning Engine adjustments (persona psychology/objections) shifted the top channel to "${adjustedFirst}". Original reasoning: ${channelReasoning}`;
    gaps.push(`Channel recommendation overridden by persona-driven signal — verify this makes sense for the specific business, not just the archetype match.`);
  }

  const secondChannel = channelScores.length > 1 ? channelScores[1].channel : (matched ? str(matched.row["Second Best"]) : "");
  const thirdChannel = channelScores.length > 2 ? channelScores[2].channel : (matched ? str(matched.row["Third Best"]) : "");
  const channelEvidence = matched ? str(matched.row["Evidence"]) : "";
  const channelConfidence = matched ? str(matched.row["Confidence"]) : "Low";

  const criticalOpportunities = findCriticalOpportunities(profile);

  let actionsForChannel: RecommendedAction[] = [];
  if (recommendedChannel) {
    // Match against the FIRST word of the recommended channel (archetypes often
    // write "Google Business Profile" or "Email (list building)" — the parenthetical
    // is a nuance, not a different channel).
    const primaryChannelKey = recommendedChannel.split("(")[0].split("/")[0].trim();
    actionsForChannel = findActionsForChannel(primaryChannelKey, profile);
  }
  if (actionsForChannel.length === 0 && recommendedChannel) {
    gaps.push(`No Marketing Actions found for recommended channel "${recommendedChannel}" — database gap, needs more action rows for this channel.`);
  }

  // A Critical opportunity that fits the business's actual budget/time
  // constraints can outrank the channel-specific action — this is deliberate:
  // "collect reviews" often beats "launch a paid campaign" for a business
  // with weak trust signals, regardless of which channel scored highest.
  const primaryRecommendation: RecommendedAction | RecommendedOpportunity | null =
    criticalOpportunities.length > 0 ? criticalOpportunities[0] :
    actionsForChannel.length > 0 ? actionsForChannel[0] : null;

  if (!primaryRecommendation) {
    gaps.push("No primary recommendation could be made — both Marketing Actions and Marketing Opportunity lookups returned nothing for this profile.");
  }

  return {
    matchedArchetype: matched ? {
      ruleId: str(matched.row["Rule ID"]),
      industry: str(matched.row["Industry"]),
      matchScore: matched.score,
    } : null,
    channelScores,
    recommendedChannel,
    secondChannel,
    thirdChannel,
    channelReasoning,
    channelEvidence,
    channelConfidence,
    channelConfidenceScore: stringConfidenceToScore(channelConfidence),
    primaryRecommendation,
    alternativeActions: actionsForChannel.slice(1, 4),
    criticalOpportunities,
    gaps,
  };
}

// Exposed for validation/debugging — lets a caller check what constraint
// values are actually valid before calling recommendNextAction().
export function getValidConstraintValues(constraintType: string): string[] {
  return BUSINESS_CONSTRAINTS
    .filter(c => s(c["Constraint Type"]) === s(constraintType))
    .map(c => str(c["Value"]));
}

/**
 * Smarkin AI — Channel Adapter Contract + Meta Channel Adapter
 *
 * Every channel adapter, present and future, implements ChannelAdapter.
 * The Decision Engine never imports a specific adapter — it only knows the
 * contract. Adding SEO or Email later means writing a new file that
 * satisfies this interface; it requires zero changes here or in
 * decisionEngine.ts. That's the whole point of Layer 3 existing as adapters
 * instead of if/else branches inside the Decision Engine.
 *
 * MetaChannelAdapter is deliberately thin — it does not reimplement any of
 * matcher.ts's logic. matcher.ts (10+ relationship layers, ~1,300 lines,
 * verified all session) stays exactly as it is; this file only translates
 * its input/output shape to and from the generic adapter contract.
 */
import { runHierarchicalMatcher, MatcherOutput } from "./matcher";
import { DecisionResult } from "./decisionEngine";
import { BusinessIntelligenceProfile } from "./businessIntelligenceEngine";
import DB_RAW from "./smarkin-db.json";

// ── The shared contract every adapter implements ───────────────────────────────
export interface ChannelExecutionContext {
  channel: string;
  matched: boolean;
  targetingSummary: string;
  confidence: number;
  evidenceNotes: string[];
  // Channel-specific detail lives here, typed loosely on purpose — the
  // Execution Brief generator and any UI consuming this can check `channel`
  // before reading channel-specific fields. This is what lets the contract
  // stay generic without losing the rich detail a specific channel produces.
  channelData: Record<string, unknown>;
}

export type ChannelAdapter = (
  decision: DecisionResult,
  businessIntelligence: BusinessIntelligenceProfile,
  objective?: string,
  country?: string,
  existingAssets?: string,
) => ChannelExecutionContext;

// ── Meta Channel Adapter ─────────────────────────────────────────────────────
export const metaChannelAdapter: ChannelAdapter = (
  decision,
  businessIntelligence,
  objective = "Sales",
  country = "Worldwide",
) => {
  const matcherOutput: MatcherOutput = runHierarchicalMatcher({
    productName: businessIntelligence.input.productName,
    description: businessIntelligence.input.description ?? "",
    businessType: businessIntelligence.input.businessType ?? "Ecommerce",
    objective,
    country,
  }, 30);

  const matched = matcherOutput.interests.length > 0;

  return {
    channel: "Meta Ads",
    matched,
    targetingSummary: matched
      ? `${matcherOutput.interests.length} verified interests (${matcherOutput.sections.primary.length} primary, ${matcherOutput.sections.secondary.length} secondary, ${matcherOutput.sections.expansion.length} expansion), ${matcherOutput.behaviors.length} behaviors, match confidence ${matcherOutput.confidence}%`
      : "No verified Meta interests found for this product — matcher.ts's own gap reporting explains why below.",
    confidence: matcherOutput.confidence,
    evidenceNotes: matcherOutput.gaps,
    channelData: {
      interests: matcherOutput.interests,
      behaviors: matcherOutput.behaviors,
      sections: matcherOutput.sections,
      classified: matcherOutput.classified,
      layerDiagnostics: matcherOutput.layerDiagnostics,
      databaseImprovementMode: matcherOutput.databaseImprovementMode,
      matchLevel: matcherOutput.matchLevel,
    },
  };
};

// ── Google Business Profile Channel Adapter ─────────────────────────────────────
// Unlike Meta, this doesn't wrap a separate matching engine — GBP execution
// guidance already lives directly in marketingActionsDatabase and
// marketingOpportunityDatabase, and the Decision Engine has already selected
// from it by the time this adapter runs. This adapter's job is narrower:
// compile what was already decided into a structured local-presence
// checklist, using the real Reasoning Notes / Common Mistakes / Evidence
// fields already on those rows rather than generating new prose.
type Row = Record<string, unknown>;
const DB_ANY = DB_RAW as unknown as Record<string, Row[] | undefined>;
const MARKETING_ACTIONS = (DB_ANY["marketingActionsDatabase"] ?? []) as Row[];
const MARKETING_OPPORTUNITY = (DB_ANY["marketingOpportunityDatabase"] ?? []) as Row[];
function s(v: unknown): string { return v == null ? "" : String(v).toLowerCase().trim(); }
function str(v: unknown): string { return v == null ? "" : String(v).trim(); }

interface LocalPresenceTask {
  task: string;
  why: string;
  avoid: string;
  evidence: string;
  source: "Marketing Actions Database" | "Marketing Opportunity Database";
}

export const googleBusinessProfileAdapter: ChannelAdapter = (decision) => {
  const gbpActions = MARKETING_ACTIONS.filter(a => s(a["Marketing Channel"]).includes("google business profile"));
  const gbpOpportunityNames = ["improve local seo presence", "collect and display reviews"];
  const gbpOpportunities = MARKETING_OPPORTUNITY.filter(o => gbpOpportunityNames.includes(s(o["Opportunity"])));

  const checklist: LocalPresenceTask[] = [
    ...gbpActions.map(a => ({
      task: str(a["Action Name"]), why: str(a["Reasoning Notes"]),
      avoid: str(a["Common Mistakes"]), evidence: str(a["Evidence Summary"]),
      source: "Marketing Actions Database" as const,
    })),
    ...gbpOpportunities.map(o => ({
      task: str(o["Opportunity"]), why: str(o["Reasoning"]),
      avoid: "", evidence: str(o["Evidence"]),
      source: "Marketing Opportunity Database" as const,
    })),
  ];

  const matched = checklist.length > 0;

  return {
    channel: "Google Business Profile",
    matched,
    targetingSummary: matched
      ? `${checklist.length} concrete local-presence tasks identified, prioritized by the Decision Engine's own selection: "${decision.primaryRecommendation && "actionName" in decision.primaryRecommendation ? decision.primaryRecommendation.actionName : decision.primaryRecommendation && "opportunity" in decision.primaryRecommendation ? decision.primaryRecommendation.opportunity : "none"}" ranked first.`
      : "No Google Business Profile tasks found in Marketing Actions or Marketing Opportunity databases — real gap, only 2 rows exist per table for this channel.",
    confidence: matched ? 85 : 0,
    evidenceNotes: matched ? [] : ["Database gap — Google Business Profile has thin action coverage (2 rows) relative to how often it's recommended (7 of 20 archetypes)."],
    channelData: { checklist },
  };
};

// ── Email Channel Adapter ─────────────────────────────────────────────────────
// Genuinely different capability from both prior adapters: email actions have
// real prerequisite chains (Collect Emails -> Welcome Sequence -> Lead Magnet
// -> Cart Abandonment), captured in marketingActionsDatabase's own Requires
// Previous Actions / Unlocks Future Actions fields. This adapter resolves
// that chain against what the business already has, rather than just
// returning the highest-priority action regardless of whether its
// prerequisite is even done yet — recommending "Launch Cart Abandonment
// Email" (priority 88) to a business with no email list at all would be a
// real sequencing error, not just a minor sub-optimality.
interface EmailSequenceStep {
  task: string;
  status: "ready" | "blocked";
  blockedBy: string;
  priorityWeight: number;
  reasoning: string;
  evidence: string;
}

export const emailChannelAdapter: ChannelAdapter = (decision, businessIntelligence, objective, country, existingAssets = "None") => {
  const emailActions = MARKETING_ACTIONS.filter(a => s(a["Marketing Channel"]).includes("email"));

  // A business with "Established" or "Advanced" assets is assumed to already
  // have completed the zero-prerequisite action (Collect Customer Emails) —
  // everything else in the chain becomes immediately ready rather than blocked.
  const hasEmailListAlready = s(existingAssets) === "established" || s(existingAssets) === "advanced";

  const sequence: EmailSequenceStep[] = emailActions.map(a => {
    const requires = str(a["Requires Previous Actions"]);
    const noPrereq = !requires || s(requires) === "none";
    const ready = noPrereq || hasEmailListAlready;
    const status: "ready" | "blocked" = ready ? "ready" : "blocked";
    return {
      task: str(a["Action Name"]),
      status,
      blockedBy: ready ? "" : requires,
      priorityWeight: Number(a["Priority Weight"]) || 0,
      reasoning: str(a["Reasoning Notes"]),
      evidence: str(a["Evidence Summary"]),
    };
  }).sort((a, b) => {
    // Ready actions first, then by priority weight within each group —
    // this is the actual sequencing fix: a blocked high-priority action
    // (Cart Abandonment, 88) should never outrank a ready lower-priority
    // one (Build Lead Magnet, 68) for a business that hasn't collected
    // emails yet.
    if (a.status !== b.status) return a.status === "ready" ? -1 : 1;
    return b.priorityWeight - a.priorityWeight;
  });

  const matched = sequence.length > 0;
  const firstReady = sequence.find(s => s.status === "ready");

  return {
    channel: "Email",
    matched,
    targetingSummary: matched
      ? `${sequence.length} email actions found, sequenced by real prerequisite chain. Next step: "${firstReady?.task ?? "none ready"}" — ${sequence.filter(s => s.status === "blocked").length} other action(s) blocked until prerequisites are met.`
      : "No Email actions found in Marketing Actions Database — real gap.",
    confidence: matched ? 88 : 0,
    evidenceNotes: matched ? [] : ["Database gap — no Email channel actions exist yet."],
    channelData: { sequence, hasEmailListAlready },
  };
};

// ── Content Marketing Channel Adapter ────────────────────────────────────────
// Pulls from BOTH "Content Marketing" and "SEO" tagged actions — not a
// simplification, but matching what the data itself already does: the B2B
// Professional Services archetype's own Recommended First Channel is
// literally "Content Marketing / SEO", a combined recommendation. Treating
// them as two separate pools would fight the source data, not follow it.
// Same prerequisite-chain handling as the Email adapter where it applies
// (Add Social Proof needs reviews collected first; Publish Case Study needs
// a completed customer outcome).
interface ContentTask {
  task: string;
  status: "ready" | "blocked";
  blockedBy: string;
  priorityWeight: number;
  reasoning: string;
  evidence: string;
  channelTag: string;
}

export const contentMarketingAdapter: ChannelAdapter = (decision, businessIntelligence, objective, country, existingAssets = "None") => {
  const contentActions = MARKETING_ACTIONS.filter(a =>
    s(a["Marketing Channel"]) === "content marketing" || s(a["Marketing Channel"]) === "seo"
  );

  const hasEstablishedAssets = s(existingAssets) === "established" || s(existingAssets) === "advanced";

  const tasks: ContentTask[] = contentActions.map(a => {
    const requires = str(a["Requires Previous Actions"]);
    const noPrereq = !requires || s(requires) === "none";
    // Unlike Email's clean single-prerequisite chain, several of these
    // requirements are conditions ("Some existing traffic to test against")
    // rather than another action's exact name — treat any non-empty,
    // non-"None" requirement as blocked unless assets suggest it's likely
    // already satisfied, rather than trying to string-match it precisely.
    const ready = noPrereq || hasEstablishedAssets;
    const status: "ready" | "blocked" = ready ? "ready" : "blocked";
    return {
      task: str(a["Action Name"]),
      status,
      blockedBy: ready ? "" : requires,
      priorityWeight: Number(a["Priority Weight"]) || 0,
      reasoning: str(a["Reasoning Notes"]),
      evidence: str(a["Evidence Summary"]),
      channelTag: str(a["Marketing Channel"]),
    };
  }).sort((a, b) => {
    if (a.status !== b.status) return a.status === "ready" ? -1 : 1;
    return b.priorityWeight - a.priorityWeight;
  });

  const matched = tasks.length > 0;
  const firstReady = tasks.find(t => t.status === "ready");

  return {
    channel: "Content Marketing",
    matched,
    targetingSummary: matched
      ? `${tasks.length} content/SEO actions found (pooled from both channel tags, since the archetype data treats them as one combined recommendation). Next step: "${firstReady?.task ?? "none ready"}".`
      : "No Content Marketing or SEO actions found — database gap.",
    confidence: matched ? 80 : 0,
    evidenceNotes: matched ? [] : ["Database gap — no Content Marketing/SEO channel actions exist yet."],
    channelData: { tasks },
  };
};

// ── Dispatcher — the ONLY place that knows which adapter to call for which
//    channel name. This is intentionally the single point of coupling
//    between Decision Engine channel names and adapter implementations —
//    adding a channel means adding one line here, nothing else. ──────────────
const ADAPTERS: Record<string, ChannelAdapter> = {
  "meta ads": metaChannelAdapter,
  "google business profile": googleBusinessProfileAdapter,
  "email": emailChannelAdapter,
  "content marketing": contentMarketingAdapter,
  "seo": contentMarketingAdapter,
};

export function dispatchToChannelAdapter(
  decision: DecisionResult,
  businessIntelligence: BusinessIntelligenceProfile,
  objective?: string,
  country?: string,
  existingAssets?: string,
): ChannelExecutionContext | null {
  // Try the top recommendation first, then fall back to second/third choice
  // if no adapter exists yet — this is a real fallback, not a silent
  // substitution: the returned context always states which choice was
  // actually used and why, via usedFallbackChannel below.
  const candidates = [
    { channel: decision.recommendedChannel, rank: "first" as const },
    { channel: decision.secondChannel, rank: "second" as const },
    { channel: decision.thirdChannel, rank: "third" as const },
  ].filter(c => c.channel);

  for (const { channel, rank } of candidates) {
    const channelKey = channel.toLowerCase().split("(")[0].split("/")[0].trim();
    const adapter = ADAPTERS[channelKey];
    if (!adapter) continue;

    const result = adapter(decision, businessIntelligence, objective, country, existingAssets);
    if (rank !== "first") {
      result.evidenceNotes = [
        `Used the ${rank}-choice channel ("${channel}") instead of the top recommendation ("${decision.recommendedChannel}") — no adapter exists yet for the top choice. This is a real fallback, not a silent substitution.`,
        ...result.evidenceNotes,
      ];
    }
    return result;
  }

  // Genuinely no adapter for any of the three ranked channels — honest, not silent.
  return null;
}

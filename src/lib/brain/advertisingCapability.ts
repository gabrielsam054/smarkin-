/**
 * Smarkin OS — Advertising Capability
 *
 * This is the exact sequence that used to live directly inside
 * runSmarkinBrain()'s body — moved, not rewritten. Every intermediate value
 * (businessIntelligence, reasoningSignal, decision, channelExecution,
 * executionBrief) is threaded between service calls in precisely the same
 * order and with precisely the same arguments as before.
 *
 * This file is where marketing-specific sequencing knowledge legitimately
 * lives — the Brain itself never sees any of this; it only ever calls
 * advertisingCapability.execute(payload, context).
 */
import { SmarkinService, BrainContext } from "./smarkinService";
import { businessIntelligenceService } from "./serviceAdapters/businessIntelligenceService";
import { marketingReasoningService } from "./serviceAdapters/marketingReasoningService";
import { decisionService } from "./serviceAdapters/decisionService";
import { channelService } from "./serviceAdapters/channelService";
import { executionService } from "./serviceAdapters/executionService";
import { BusinessProfile, DecisionResult } from "../decisionEngine";
import { ChannelExecutionContext } from "../channelAdapters";
import { ExecutionBrief } from "../executionBriefGenerator";
import { MarketingReasoningSignal } from "../marketingReasoningEngine";
import { BusinessIntelligenceProfile } from "../businessIntelligenceEngine";
import { recordStep } from "./diagnostics/traceRecorder";
import { log } from "./diagnostics/logger";
import { customerResearchService } from "../capabilities/customerResearch/customerResearchCapability";
import { audienceResearchService } from "../capabilities/audienceResearch/audienceResearchCapability";
import { AudienceResearchResult } from "../capabilities/audienceResearch/types";
import { buildBusinessContext } from "../knowledge/engine/businessUnderstandingEngine";
import { resolveIndustryKnowledge } from "../knowledge/packs/resolver";

// This IS today's SmarkinRequest, renamed only in this file's local scope for
// clarity that it's now the Advertising capability's specific payload shape —
// the type itself, and every field on it, is unchanged.
export interface AdvertisingPayload {
  productName: string;
  description?: string;
  businessType?: string;
  industry: string;
  businessModel: string;
  productType?: string;
  budgetRange: string;
  weeklyHours: string;
  teamSize: string;
  marketingExperience: string;
  existingAssets: string;
  customerAwareness?: string;
  businessStage: string;
  goal: string;
  objective?: string;
  country?: string;
}

export interface AdvertisingResult {
  executionId: string;
  businessIntelligence: BusinessIntelligenceProfile;
  reasoningSignal: MarketingReasoningSignal;
  decision: DecisionResult;
  channelExecution: ChannelExecutionContext | null;
  executionBrief: ExecutionBrief;
  // Advertising now consumes the Audience Research asset instead of
  // discovering audiences itself — genuinely NEW context, additive only.
  // Deliberately does NOT replace matcher.ts's interest-discovery inside
  // channelExecution: that engine is proven, verified, and ~1,300 lines of
  // tested matching logic; Audience Research's own interest matching is a
  // simpler, single-tier overlap match built for a different purpose
  // (cross-persona discovery, not campaign-ready targeting parameters).
  // Swapping one for the other here would be a real quality regression,
  // not a neutral architectural change — so this is additive, not a
  // replacement, until Audience Research's matching is proven equally
  // capable or a deliberate tradeoff is chosen.
  audienceResearch: AudienceResearchResult | null;
  // Industry Pack marketing knowledge — same additive pattern as
  // audienceResearch above: populated when a pack covers this business,
  // null otherwise, and deliberately NOT replacing anything. The
  // execution brief and decision logic are untouched; this carries the
  // pack's curated positioning/headlines/offers/CTAs alongside them,
  // with full source attribution, for the UI and future capabilities to
  // consume.
  industryMarketingKnowledge: {
    industry: string;
    category: string;
    positioningIdeas: string[];
    valuePropositions: string[];
    headlines: string[];
    offers: string[];
    callsToAction: string[];
    campaignObjectives: string[];
    riskReducers: string[];
    trustBuilders: string[];
    source: string;
    confidence: number;
  } | null;
  allGaps: string[];
  gapsByLayer: {
    businessIntelligence: string[];
    decision: string[];
  };
}

export const advertisingCapability: SmarkinService<AdvertisingPayload, AdvertisingResult> = {
  serviceId: "advertising",
  serviceType: "capability",
  version: "1.0.0",
  dependsOn: ["business-intelligence", "decision", "channel", "execution"],
  optionalDependsOn: ["marketing-reasoning"],
  requiresBusinessIntelligence: true,
  requiresMemory: "write",

  async execute(payload: AdvertisingPayload, context: BrainContext): Promise<AdvertisingResult> {
    // Step 1 — Business Intelligence. Populates context.businessIntelligence
    // for every subsequent service in this same call.
    const businessIntelligence = await recordStep(
      context.executionId, "advertising", "business-intelligence", 0,
      () => businessIntelligenceService.execute(
        { productName: payload.productName, description: payload.description, businessType: payload.businessType },
        context,
      ),
    );
    const populatedContext: BrainContext = { ...context, businessIntelligence };

    // Step 2 — Marketing Reasoning, using the SAME shared persona resolution
    // Customer Research uses (via customerResearchService.getPersonaNames()),
    // instead of independently recomputing personas here. This is the
    // "consume the shared research service, don't reconstruct insights"
    // change — both paths still resolve to the identical underlying
    // BusinessIntelligenceProfile (same cache key), so the persona list is
    // byte-identical to what the old direct getPersonaNames() call produced.
    const personaNames = await customerResearchService.getPersonaNames(
      context.userId,
      payload.productName,
      { businessName: payload.productName, product: payload.productName, industry: payload.industry },
      populatedContext,
    );
    const reasoningSignal = await recordStep(
      context.executionId, "advertising", "marketing-reasoning", 1,
      () => marketingReasoningService.execute({ personaNames }, populatedContext),
    );

    // Step 3 — Decision Engine.
    const businessProfile: BusinessProfile = {
      industry: payload.industry,
      businessModel: payload.businessModel,
      productType: payload.productType,
      budgetRange: payload.budgetRange,
      weeklyHours: payload.weeklyHours,
      teamSize: payload.teamSize,
      marketingExperience: payload.marketingExperience,
      existingAssets: payload.existingAssets,
      customerAwareness: payload.customerAwareness,
      businessStage: payload.businessStage,
      goal: payload.goal,
    };
    const decision = await recordStep(
      context.executionId, "advertising", "decision", 2,
      () => decisionService.execute({ businessProfile, reasoningSignal }, populatedContext),
    );

    // Step 3.5 — Audience Research, consumed rather than discovered.
    // Fault-tolerant by design: this is genuinely new, additive context,
    // not a required dependency for Advertising's core decision/execution
    // path. A failure here degrades to null with a logged gap rather than
    // breaking the whole Advertising flow — the proven decision/channel/
    // execution steps below never depend on this succeeding.
    let audienceResearch: AudienceResearchResult | null = null;
    try {
      audienceResearch = await recordStep(
        context.executionId, "advertising", "audience-research", 2.5,
        () => audienceResearchService.loadOrGenerate(
          context.userId, payload.productName,
          { businessName: payload.productName, industry: payload.industry, product: payload.productName },
          populatedContext,
        ).then(asset => ({ ...asset.result, researchId: asset.id })),
      );
    } catch (err) {
      log("error", "Audience Research consumption failed inside Advertising — degrading to null, core flow unaffected", { error: (err as Error).message });
    }

    // Step 4 — Channel Engine.
    const channelExecution = await recordStep(
      context.executionId, "advertising", "channel", 3,
      () => channelService.execute(
        { decision, objective: payload.objective, country: payload.country, existingAssets: payload.existingAssets },
        populatedContext,
      ),
    );

    // Step 5 — Execution Engine.
    const executionBrief = await recordStep(
      context.executionId, "advertising", "execution", 4,
      () => executionService.execute(
        { decision, channelExecution, industry: payload.industry, objective: payload.objective ?? payload.goal },
        populatedContext,
      ),
    );

    const allGaps = [...businessIntelligence.gaps, ...decision.gaps, ...executionBrief.gaps];
    if (audienceResearch) {
      allGaps.push(...audienceResearch.gaps.map(g => `[Audience Research] ${g}`));
    } else {
      allGaps.push("Audience Research context unavailable for this run — Advertising's decision and execution are unaffected, but audience-reach detail (interests, platforms, targeting strategies) isn't attached.");
    }
    if (!channelExecution) {
      allGaps.push(`No Channel Adapter built yet for "${decision.recommendedChannel}" — only Meta Ads has an adapter today. Decision and reasoning are still valid; execution detail for this specific channel isn't available yet.`);
    } else {
      allGaps.push(...channelExecution.evidenceNotes.map(n => `[${channelExecution.channel}] ${n}`));
    }

    // Industry Pack marketing knowledge — additive. The resolver is
    // memoized, so when the Customer Research step above already
    // classified this business, this is a cache hit, not a recomputation.
    const packResolved = resolveIndustryKnowledge(buildBusinessContext(payload.productName));
    const industryMarketingKnowledge = (packResolved.hasPack && packResolved.pack && packResolved.category)
      ? {
          industry: packResolved.pack.industry,
          category: packResolved.category.category,
          positioningIdeas: packResolved.pack.marketingKnowledge.positioningIdeas,
          valuePropositions: packResolved.pack.marketingKnowledge.valuePropositions,
          headlines: packResolved.pack.marketingKnowledge.headlines,
          offers: packResolved.pack.marketingKnowledge.offers,
          callsToAction: packResolved.pack.marketingKnowledge.callsToAction,
          campaignObjectives: packResolved.pack.marketingKnowledge.campaignObjectives,
          riskReducers: packResolved.pack.marketingKnowledge.riskReducers,
          trustBuilders: packResolved.pack.marketingKnowledge.trustBuilders,
          source: packResolved.pack.source,
          confidence: packResolved.confidence,
        }
      : null;

    return {
      executionId: context.executionId,
      businessIntelligence,
      reasoningSignal,
      decision,
      channelExecution,
      executionBrief,
      audienceResearch,
      industryMarketingKnowledge,
      allGaps,
      gapsByLayer: {
        businessIntelligence: businessIntelligence.gaps,
        decision: decision.gaps,
      },
    };
  },
};

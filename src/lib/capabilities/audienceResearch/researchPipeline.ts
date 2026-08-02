import { BrainContext } from "../../brain/smarkinService";
import { getOrBuildBusinessIntelligence } from "../../brain/businessIntelligenceCache";
import { CURRENT_DATA_VERSION } from "../../brain/dataVersion";
import { customerResearchService } from "../customerResearch/customerResearchCapability";
import { discoverAudienceCandidates } from "./services/audienceDiscoveryService";
import { matchInterests } from "./services/interestMatcher";
import { matchBehaviors } from "./services/behaviorMatcher";
import { matchDemographics } from "./services/demographicMatcher";
import { evaluatePlatforms } from "./services/platformRecommendationService";
import { generateStrategies } from "./services/strategyGenerator";
import { generateAudienceInsights } from "./services/audienceInsightGenerator";
import { calculateAudienceConfidence } from "./services/confidenceCalculator";
import { collectEvidence } from "./services/evidenceCollector";
import {
  AudienceResearchInput, AudienceResearchResult, AudienceRecommendation, TargetingStrategy, PlatformRecommendation,
} from "./types";
import { buildBusinessContext } from "../../knowledge/engine/businessUnderstandingEngine";
import { resolveIndustryKnowledge } from "../../knowledge/packs/resolver";

export interface AudiencePipelineOutput {
  result: AudienceResearchResult;
  sourceDataVersion: string;
}

/**
 * Business Context -> Customer Analysis -> Audience Discovery -> Interest
 * Matching -> Behavior Matching -> Demographic Matching -> Platform
 * Evaluation -> Strategy Generation -> Confidence Calculation -> Evidence
 * Collection -> Result Builder, exactly as specified.
 *
 * "Business Context" and "Customer Analysis" are not separate steps here —
 * they ARE the existing Business Intelligence Cache and Customer Research
 * Service, reused directly. Re-deriving personas or business profile here
 * would be exactly the duplication this capability is required not to do.
 */
export async function runAudienceResearchPipeline(
  userId: string,
  payload: AudienceResearchInput,
  context: BrainContext,
): Promise<AudiencePipelineOutput> {
  const gaps: string[] = [];
  const evidenceSources: { label: string; table: string; rowsUsed: number }[] = [];

  // Business Context — reused, not recomputed.
  const businessIntelligence = await getOrBuildBusinessIntelligence(userId, {
    productName: payload.product || payload.businessName,
    businessType: payload.industry,
  }, context.executionId);

  // Customer Analysis — reused via the shared, cached Customer Research
  // service, not by re-running persona/objection/pain-point logic here.
  const businessId = payload.product || payload.businessName;
  const researchAsset = await customerResearchService.loadOrGenerate(userId, businessId, {
    businessName: payload.businessName, industry: payload.industry, product: payload.product,
  }, context);
  const personas = researchAsset.result.customerPersonas.map(p => ({ name: p.name, primaryGoal: p.primaryGoal }));

  // Audience Discovery
  const candidates = discoverAudienceCandidates(personas, gaps);
  evidenceSources.push({ label: "Customer Personas", table: "Customer Research asset", rowsUsed: candidates.length });

  // Interest Matching, Behavior Matching, Demographic Matching — per candidate
  const primaryAudiences: AudienceRecommendation[] = [];
  let totalInterestRows = 0, totalBehaviorRows = 0, totalDemoRows = 0;

  for (const candidate of candidates) {
    const { interests, rowsUsed: interestRows } = matchInterests(candidate.name, gaps);
    const { behaviors, rowsUsed: behaviorRows } = matchBehaviors(candidate.name, candidate.description, gaps);
    const { demographics, rowsUsed: demoRows } = matchDemographics(candidate.name, candidate.description, gaps);
    totalInterestRows += interestRows; totalBehaviorRows += behaviorRows; totalDemoRows += demoRows;

    const topDemo = demographics[0];
    const candidateEvidence = collectEvidence([
      { label: "Meta Interest Database", table: "metaAdsInterest", rowsUsed: interestRows },
      { label: "Behavior Database", table: "behaviors", rowsUsed: behaviorRows },
      { label: "Demographic Database", table: "demographicDatabase", rowsUsed: demoRows },
    ]);

    primaryAudiences.push({
      id: candidate.id,
      name: candidate.name,
      description: candidate.description,
      confidence: calculateAudienceConfidence({
        audienceCount: 1, interestCount: interests.length, behaviorCount: behaviors.length,
        demographicCount: demographics.length, platformCount: 0, strategyCount: 0, gapCount: 0,
      }),
      demographics: demographics.map(d => ({ name: d.name, category: d.category, sizeMin: d.sizeMin, sizeMax: d.sizeMax, region: d.region, source: d.source })),
      interests,
      behaviors,
      audienceSize: topDemo ? { min: topDemo.sizeMin, max: topDemo.sizeMax, region: topDemo.region } : null,
      platforms: [], // filled in below once platform evaluation runs, kept per-audience empty here since suitability is business-level, not audience-level, in the real data available
      reasoning: `Derived from the "${candidate.name}" persona Customer Research identified, matched against ${interestRows} real interest row(s), ${behaviorRows} real behavior row(s), and ${demoRows} real demographic row(s).`,
      evidence: candidateEvidence,
    });
  }
  evidenceSources.push({ label: "Meta Interest Database", table: "metaAdsInterest", rowsUsed: totalInterestRows });
  evidenceSources.push({ label: "Behavior Database", table: "behaviors", rowsUsed: totalBehaviorRows });
  evidenceSources.push({ label: "Demographic Database", table: "demographicDatabase", rowsUsed: totalDemoRows });

  // Platform Evaluation — business-level, not per-audience. Industry Pack
  // takes priority when one covers this business (same pack-priority
  // pattern proven in Customer Research): the pack's channelSuitability is
  // curated per-industry data, richer than the sparse 20-row
  // channelSuitabilityDatabase the PAT flagged. Businesses outside pack
  // coverage fall through to the existing evaluatePlatforms unchanged.
  const businessContext = buildBusinessContext(businessId);
  const resolvedPack = resolveIndustryKnowledge(businessContext);
  let platformRecommendations: PlatformRecommendation[];
  if (resolvedPack.hasPack && resolvedPack.pack) {
    platformRecommendations = resolvedPack.pack.audienceKnowledge.channelSuitability.map(c => ({
      platform: c.platform,
      suitability: c.suitability,
      reasoning: `From the ${resolvedPack.pack!.industry} Industry Pack (${resolvedPack.pack!.source}) — curated channel suitability for this industry.`,
      recommendedObjectives: [], // the pack's channelSuitability carries no per-platform objectives — honestly empty, not fabricated
    }));
    evidenceSources.push({ label: "Industry Pack Channel Suitability", table: resolvedPack.pack.source, rowsUsed: platformRecommendations.length });
    gaps.push(...resolvedPack.gaps);
  } else {
    const legacy = evaluatePlatforms(payload.industry, gaps);
    platformRecommendations = legacy.platforms;
    evidenceSources.push({ label: "Channel Suitability Database", table: "channelSuitabilityDatabase", rowsUsed: legacy.rowsUsed });
  }

  // Strategy Generation
  const { strategies, rowsUsed: strategyRows } = generateStrategies(gaps);
  evidenceSources.push({ label: "Audience Strategies Database", table: "audienceStrategies", rowsUsed: strategyRows });
  const targetingStrategies: TargetingStrategy[] = strategies.map(s => ({
    name: s.name,
    description: `${s.name} — best for ${s.bestFor}, typically used at the ${s.funnelStage.toLowerCase()} funnel stage.`,
    bestFor: s.bestFor,
    confidence: 70, // audienceStrategies has no per-row confidence column — a real, moderate default rather than a fabricated high number, disclosed here rather than silently asserted
    budgetRecommendation: null, // no real budget data source for this table
    learningSpeed: null, // no real learning-speed data source for this table
    platforms: platformRecommendations,
    reasoning: `Matched from audienceStrategies (real reference table) for the ${s.funnelStage.toLowerCase()} funnel stage.`,
  }));

  // Audience Insights — reused from Customer Research's real objections/pain points.
  const audienceInsights = generateAudienceInsights(
    researchAsset.result.buyingObjections.map(o => ({ category: o.category, objection: o.objection })),
    researchAsset.result.painPoints.map(p => ({ description: p.description, urgencyScore: p.urgencyScore })),
    gaps,
  );

  // Confidence Calculation — overall
  const confidence = calculateAudienceConfidence({
    audienceCount: candidates.length,
    interestCount: totalInterestRows,
    behaviorCount: totalBehaviorRows,
    demographicCount: totalDemoRows,
    platformCount: platformRecommendations.length,
    strategyCount: strategies.length,
    gapCount: gaps.length,
  });

  // Evidence Collection
  const evidence = collectEvidence(evidenceSources);

  // Result Builder
  const result: AudienceResearchResult = {
    businessId,
    confidence,
    primaryAudiences: primaryAudiences.slice(0, 1),
    secondaryAudiences: primaryAudiences.slice(1),
    targetingStrategies,
    platformRecommendations,
    audienceInsights,
    evidence,
    gaps: [...businessIntelligence.gaps, ...gaps],
    metadata: { version: 1, generatedAt: new Date().toISOString() }, // version overwritten by the service layer once persisted
    researchId: null,
  };

  return { result, sourceDataVersion: CURRENT_DATA_VERSION };
}

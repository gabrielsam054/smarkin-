/**
 * Smarkin OS — Customer Research Pipeline (extracted)
 *
 * The actual six-service orchestration, extracted from what used to be
 * inline inside customerResearchCapability.ts's execute(). Extracted so it
 * has exactly one home instead of being duplicated between the capability
 * and CustomerResearchService's default generator — both now call this
 * same function.
 */
import { BrainContext } from "../../brain/smarkinService";
import { getOrBuildBusinessIntelligence, CURRENT_DATA_VERSION } from "../../brain/businessIntelligenceCache";
import { getPersonaNames } from "../../businessIntelligenceEngine";
import { buildBusinessContext } from "../../knowledge/engine/businessUnderstandingEngine";
import { resolveIndustryKnowledge } from "../../knowledge/packs/resolver";
import { recordStep } from "../../brain/diagnostics/traceRecorder";
import { generatePersonas } from "./services/personaGenerator";
import { analyzePainPoints } from "./services/painPointAnalyzer";
import { analyzeMotivations } from "./services/motivationAnalyzer";
import { mapJourney } from "./services/journeyMapper";
import { analyzeLanguage } from "./services/languageAnalyzer";
import { generateMessaging } from "./services/messagingGenerator";
import { calculateConfidence } from "./services/confidenceCalculator";
import { CustomerResearchInput, CustomerResearchResult } from "./types";

export interface ResearchPipelineOutput {
  personaNames: string[];
  result: CustomerResearchResult;
  sourceDataVersion: string;
}

export async function runResearchPipeline(
  userId: string,
  payload: CustomerResearchInput,
  context: BrainContext,
): Promise<ResearchPipelineOutput> {
  const gaps: string[] = [];

  const businessIntelligence = await recordStep(
    context.executionId, "customer-research", "business-intelligence", 0,
    () => getOrBuildBusinessIntelligence(userId, {
      productName: payload.product || payload.businessName,
      description: payload.services,
      businessType: payload.industry,
    }, context.executionId),
  );

  const personaNames = getPersonaNames(businessIntelligence);
  const businessContext = buildBusinessContext(payload.product || payload.businessName);

  // Phase 1 — record which Industry Pack sections Business Intelligence
  // used, as evidence. Populated on the profile the caller already has,
  // not inside gatherBusinessIntelligence() itself.
  const bipacked = resolveIndustryKnowledge(businessContext);
  if (bipacked.hasPack && bipacked.pack && bipacked.category) {
    businessIntelligence.industryPackContext = {
      industry: bipacked.pack.industry,
      category: bipacked.category.category,
      businessModel: bipacked.category.businessModel,
      revenueModel: bipacked.category.revenueModel,
      marketOverview: bipacked.pack.industryIntelligence.marketOverview,
      seasonality: bipacked.pack.industryIntelligence.seasonality,
      opportunities: bipacked.pack.industryIntelligence.opportunities,
      risks: bipacked.pack.industryIntelligence.businessRisks,
      source: bipacked.pack.source,
      confidence: bipacked.confidence,
    };
  }

  const customerPersonas = await recordStep(
    context.executionId, "customer-research", "persona-generator", 1,
    async () => generatePersonas(businessIntelligence, gaps, businessContext),
  );

  const painPoints = await recordStep(
    context.executionId, "customer-research", "pain-point-analyzer", 2,
    async () => analyzePainPoints(businessIntelligence, gaps, businessContext),
  );

  const { desires, buyingMotivations, buyingObjections } = await recordStep(
    context.executionId, "customer-research", "motivation-analyzer", 3,
    async () => analyzeMotivations(businessIntelligence, personaNames, gaps, businessContext),
  );

  const { languagePatterns, searchIntentExtra, rowsUsed: languageRowsUsed } = await recordStep(
    context.executionId, "customer-research", "language-analyzer", 4,
    async () => analyzeLanguage(businessIntelligence, gaps),
  );

  const { buyingStage, customerAwareness, searchIntent: journeySearchIntent } = await recordStep(
    context.executionId, "customer-research", "journey-mapper", 5,
    async () => mapJourney(businessIntelligence, gaps),
  );

  const { recommendedMessaging, emotionalTriggers } = await recordStep(
    context.executionId, "customer-research", "messaging-generator", 6,
    async () => generateMessaging(personaNames, painPoints, buyingStage, gaps),
  );

  const journeyStagesWithData = buyingStage.filter(s => s.keyMessage !== null).length;
  const confidenceScore = calculateConfidence({
    personaCount: customerPersonas.length,
    painPointCount: painPoints.length,
    objectionCount: buyingObjections.length,
    languageRowsUsed,
    journeyStagesWithData,
    gapCount: gaps.length,
  });

  const result: CustomerResearchResult = {
    researchId: null, // not known until the service persists this — overwritten by customerResearchCapability.execute() after saving
    customerPersonas,
    painPoints,
    desires,
    buyingMotivations,
    buyingObjections,
    emotionalTriggers,
    demographics: { ageRanges: [], occupations: [], incomeLevel: [] },
    psychographics: { lifestyles: [], values: [] },
    customerGoals: customerPersonas.map(p => p.primaryGoal).filter(Boolean),
    customerFrustrations: painPoints.map(p => p.description),
    languagePatterns,
    searchIntent: [...new Set([...journeySearchIntent, ...searchIntentExtra])],
    buyingStage,
    customerAwareness,
    recommendedMessaging,
    confidenceScore,
    sources: [
      { table: "customerPersonaDatabase", rowsUsed: customerPersonas.length },
      { table: "productProblemDatabase / Knowledge Graph pain points", rowsUsed: painPoints.length },
      { table: "edges (HAS_OBJECTION) / buyingsolutions", rowsUsed: buyingObjections.length },
      { table: "keywordMappingDatabase", rowsUsed: languageRowsUsed },
      { table: "customerJourneyDatabase", rowsUsed: journeyStagesWithData },
      { table: "copyangles / persuasionedges", rowsUsed: emotionalTriggers.length },
    ],
    metadata: {
      executionId: context.executionId,
      researchVersion: CURRENT_DATA_VERSION,
      generatedAt: new Date().toISOString(),
      businessName: payload.businessName,
      industry: payload.industry,
    },
    gaps: [...businessIntelligence.gaps, ...gaps],
  };

  if (payload.previousResearch) {
    result.gaps.push("previousResearch was provided but this version does not yet merge/diff against prior research — accepted for future use but currently unused.");
  }
  if (payload.competitorIntelligence) {
    result.gaps.push("competitorIntelligence was provided but no Competitor Engine exists yet — accepted but currently unused.");
  }

  return { personaNames, result, sourceDataVersion: CURRENT_DATA_VERSION };
}

/**
 * Smarkin OS — Audience Research Capability, Type Definitions
 *
 * Answers "how do we reach this customer?" — distinct from Customer
 * Research ("who is the customer?"). Deliberately platform-agnostic:
 * no field here assumes Meta, Google, or any single channel. Real data
 * sources checked before designing this: demographicDatabase has real
 * audience-size ranges, behaviors has 189 real rows with match keywords,
 * channelSuitabilityDatabase already scores multiple platforms per
 * business profile. Where a field has no real backing data, it's typed
 * nullable and left null, never fabricated.
 */

export interface AudienceResearchInput {
  businessName: string;
  product: string;
  industry: string;
  businessGoals?: string;
}

export interface Demographic {
  name: string;
  category: string;
  sizeMin: number | null;
  sizeMax: number | null;
  region: string | null;
  source: string;
}

export interface Interest {
  name: string;
  source: string;
}

export interface Behavior {
  name: string;
  category: string;
  source: string;
}

export interface AudienceSize {
  min: number | null;
  max: number | null;
  region: string | null;
}

export interface PlatformMatch {
  platform: string;
  suitable: boolean;
}

export interface PlatformRecommendation {
  platform: string;
  suitability: number; // 0-100
  reasoning: string;
  recommendedObjectives: string[];
}

export interface Evidence {
  label: string;
  table: string;
  rowsUsed: number;
  matched: boolean;
}

export interface AudienceRecommendation {
  id: string;
  name: string;
  description: string;
  confidence: number;
  demographics: Demographic[];
  interests: Interest[];
  behaviors: Behavior[];
  audienceSize: AudienceSize | null;
  platforms: PlatformMatch[];
  reasoning: string;
  evidence: Evidence[];
}

export interface BudgetRecommendation {
  amount: string; // caller/source-formatted string — this type has no currency opinion
  period: "day" | "week" | "month";
  source: string;
}

export interface TargetingStrategy {
  name: string;
  description: string;
  bestFor: string;
  confidence: number;
  budgetRecommendation: BudgetRecommendation | null;
  learningSpeed: string | null;
  platforms: PlatformRecommendation[];
  reasoning: string;
}

export interface AudienceInsight {
  category: "preference" | "avoidance" | "purchase-intent" | "seasonality" | "price-sensitivity" | "loyalty" | "trigger";
  insight: string;
  source: string;
}

export interface AudienceResearchResult {
  businessId: string;
  confidence: number;
  primaryAudiences: AudienceRecommendation[];
  secondaryAudiences: AudienceRecommendation[];
  targetingStrategies: TargetingStrategy[];
  platformRecommendations: PlatformRecommendation[];
  audienceInsights: AudienceInsight[];
  evidence: Evidence[];
  gaps: string[];
  metadata: {
    version: number;
    generatedAt: string;
  };
  researchId: string | null;
}

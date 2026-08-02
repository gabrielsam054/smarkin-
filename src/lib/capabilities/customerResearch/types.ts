/**
 * Smarkin OS — Customer Research Capability, Type Definitions
 *
 * Every field is structured data — arrays, enums, scored objects — never a
 * free-text paragraph. This matches the explicit "never return unstructured
 * paragraphs, everything machine-readable" requirement, and the same
 * discipline every prior engine in this codebase has followed: real,
 * attributable data over generated prose.
 */

export interface CustomerResearchInput {
  businessName: string;
  industry: string;
  product: string;
  services?: string;
  targetMarket?: string;
  country?: string;
  businessGoals?: string;
  previousResearch?: CustomerResearchResult; // optional — enables re-running without losing prior context
  competitorIntelligence?: unknown; // optional, no Competitor Engine exists yet (per the OS architecture doc) — accepted but currently unused, honestly
  userPreferences?: { focusAreas?: string[] };
}

export interface CustomerPersona {
  name: string;
  ageRange: string | null; // null, not fabricated, when the source data doesn't specify one
  occupation: string | null;
  incomeLevel: string | null;
  lifestyle: string | null;
  primaryGoal: string;
  buyingPower: "Low" | "Medium" | "High" | "Unknown";
  experienceLevel: "Beginner" | "Intermediate" | "Advanced" | "Unknown";
  source: "knowledge-graph" | "tag-overlap" | "both" | "industry-pack";
  // Optional — only populated when `source` is "industry-pack", since only
  // Industry Pack personas carry this depth. Never fabricated for
  // knowledge-graph/tag-overlap personas, which genuinely don't have it.
  frustrations?: string[];
  decisionCriteria?: string[];
  emotionalDrivers?: string[];
  customerJourney?: string;
  typicalBudget?: string | null;
}

export interface PainPoint {
  description: string;
  category: "top-frustration" | "daily-problem" | "obstacle" | "hidden";
  urgencyScore: number; // 0-100, derived from source confidence, not invented
  source: string; // which database/table this came from, for the "sources" field
}

export interface Desires {
  primary: string[];
  secondary: string[];
  emotional: string[];
  identity: string[];
}

export interface BuyingMotivation {
  logical: string[];
  emotional: string[];
  fearBased: string[];
  aspirational: string[];
}

export interface BuyingObjection {
  category: "price" | "trust" | "timing" | "competitors" | "complexity" | "risk";
  objection: string;
  recommendedSolution: string | null;
}

export interface CustomerLanguage {
  frequentPhrases: string[];
  commonQuestions: string[];
  searchQueries: string[];
  commonWording: string[];
}

export interface JourneyStage {
  stage: "Problem Aware" | "Solution Aware" | "Product Aware" | "Most Aware";
  customerState: string | null;
  customerMindset: string | null;
  keyMessage: string | null;
  recommendedCTA: string | null;
}

export interface RecommendedMessaging {
  headlineIdeas: string[];
  offerAngle: string | null;
  positioning: string | null;
  ctaRecommendations: string[];
}

export interface ResearchSource {
  table: string;
  rowsUsed: number;
}

export interface ResearchMetadata {
  executionId: string;
  researchVersion: string;
  generatedAt: string;
  businessName: string;
  industry: string;
}

export interface CustomerResearchResult {
  researchId: string | null;
  customerPersonas: CustomerPersona[];
  painPoints: PainPoint[];
  desires: Desires;
  buyingMotivations: BuyingMotivation;
  buyingObjections: BuyingObjection[];
  emotionalTriggers: string[];
  demographics: { ageRanges: string[]; occupations: string[]; incomeLevel: string[] };
  psychographics: { lifestyles: string[]; values: string[] };
  customerGoals: string[];
  customerFrustrations: string[];
  languagePatterns: CustomerLanguage;
  searchIntent: string[];
  buyingStage: JourneyStage[];
  customerAwareness: string[];
  recommendedMessaging: RecommendedMessaging;
  confidenceScore: number; // 0-100, computed from real match ratio — see confidenceCalculator.ts
  sources: ResearchSource[];
  metadata: ResearchMetadata;
  gaps: string[]; // same "log the gap, never fabricate" pattern as every prior engine
}

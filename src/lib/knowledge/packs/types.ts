/**
 * Smarkin OS — Industry Knowledge Pack Schema
 *
 * A pack carries its own real content directly, rather than filtering
 * existing generic tables down to nothing. Last sprint's integration
 * proved category-filtering prevents cross-industry false positives, but
 * also surfaced its limit: when the generic tables have no real content
 * for a category (Digital Marketing Agency, Dental Clinic), filtering
 * correctly removes the wrong answer but leaves nothing behind. A pack
 * fixes this by being the actual source of real, industry-specific
 * content — personas, pain points, audience data, and messaging — not a
 * filter over someone else's generic data.
 */

export interface ClassificationRule {
  aliases: string[];
  keywords: string[];
  confidenceHint: number;
}

export interface CategoryProfile {
  category: string;
  subcategory: string | null;
  products: string[];
  services: string[];
  businessModel: string;
  revenueModel: string;
  classificationRules: ClassificationRule;
}

export interface IndustryIntelligenceSection {
  marketOverview: string;
  typicalCompetitors: string[];
  customerExpectations: string[];
  buyingCycle: string;
  pricingModels: string[];
  seasonality: string | null;
  regulations: string[] | null;
  marketTrends: string[];
  businessRisks: string[];
  opportunities: string[];
}

export interface IndustryPersona {
  personaName: string;
  category: string; // the pack's own category this persona belongs to — never a cross-category generic persona
  description: string;
  goals: string[];
  painPoints: string[];
  frustrations: string[];
  buyingMotivations: string[];
  objections: string[];
  decisionCriteria: string[];
  emotionalDrivers: string[];
  preferredCommunication: string[];
  customerJourney: string;
  typicalBudget: string | null;
}

export interface AudienceKnowledgeSection {
  interests: string[];
  behaviors: string[];
  demographics: string[];
  occupations: string[];
  education: string[];
  incomeRanges: string[];
  deviceUsage: string[];
  platformPreferences: string[];
  purchaseIntent: string;
  audienceSignals: string[];
  geographicPatterns: string[];
  channelSuitability: { platform: string; suitability: number }[];
}

export interface MarketingKnowledgeSection {
  positioningIdeas: string[];
  valuePropositions: string[];
  messagingAngles: string[];
  hooks: string[];
  headlines: string[];
  offers: string[];
  riskReducers: string[];
  trustBuilders: string[];
  callsToAction: string[];
  creativeThemes: string[];
  campaignObjectives: string[];
  funnelIdeas: string[];
}

export interface IndustryPack {
  id: string;
  industry: string;
  categories: CategoryProfile[]; // multiple real, distinct categories within one industry (e.g. Laptops, Gaming PCs, IT Equipment within Consumer Electronics)
  industryIntelligence: IndustryIntelligenceSection;
  personas: IndustryPersona[]; // each tagged with its own `category`, matching one of the categories above
  audienceKnowledge: AudienceKnowledgeSection;
  marketingKnowledge: MarketingKnowledgeSection;
  source: string;
  confidence: number;
  version: string;
  lastUpdated: string;
}

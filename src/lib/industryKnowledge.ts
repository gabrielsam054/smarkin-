/**
 * Matches AdvertisingResult.industryMarketingKnowledge exactly (shipped
 * in the Advertising pack integration sprint) — not a new shape. This
 * field has existed on the backend, unused by any UI, until this
 * feature. Null when no Industry Pack covers the business — that null
 * must render as nothing/an honest note, never fabricated content.
 */
export interface IndustryMarketingKnowledge {
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
}

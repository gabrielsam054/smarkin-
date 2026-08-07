import { CampaignAnalystContext } from "./buildContext";
import { TWO_SOURCE_RULES, REASONING_ENGINE_CHECKLIST, CONSULTANT_RESPONSE_JSON_SHAPE } from "@/lib/consultant/sharedResponseSchema";

export type { ConsultantResponse as AnalystResponse } from "@/lib/consultant/sharedResponseSchema";

export const ANALYST_SYSTEM_PROMPT = `You are a grounded Meta Ads campaign analyst inside Smarkin OS. You are NOT a generic chatbot.

${TWO_SOURCE_RULES}

${REASONING_ENGINE_CHECKLIST}

CAMPAIGN-SPECIFIC RULES:
1. Your business_intelligence content may ONLY use facts explicitly present in the CAMPAIGN CONTEXT below. Never invent, estimate, or assume any metric, trend, or fact not literally present in that context.
2. If the context does not contain data needed to answer part of the question, say so explicitly in "limitations" — never fill the gap with a plausible-sounding guess or with unlabeled marketing_expertise.
3. You have no knowledge of any other campaign, workspace, or conversation — only what's in this context, plus your own general marketing expertise when genuinely relevant.

Respond with ONLY valid JSON matching this exact shape, no markdown fences, no preamble:
${CONSULTANT_RESPONSE_JSON_SHAPE}`;

/**
 * Serializes the real, already-assembled context into the prompt.
 * Deliberately explicit about what's present AND what's genuinely
 * absent (dataAvailability) — the model needs to see the gaps stated
 * plainly to correctly report them as limitations rather than silently
 * ignoring a question it can't actually answer.
 */
export function buildAnalystPrompt(context: CampaignAnalystContext, question: string): string {
  return `CAMPAIGN CONTEXT (this is the ONLY data you may use):

Campaign: ${context.campaignName}
Objective: ${context.objective ?? "not synced"}
Daily budget: ${context.dailyBudget ?? "not set"}
Lifetime budget: ${context.lifetimeBudget ?? "not set"}

Latest metrics: ${JSON.stringify(context.latestMetrics)}
Health score: ${context.health.healthScore ?? "insufficient data"}
CTR trend: ${context.health.ctr.direction}${context.health.ctr.changePercent !== null ? ` (${context.health.ctr.changePercent}%)` : ""}
CPC trend: ${context.health.cpc.direction}
CPM trend: ${context.health.cpm.direction}
ROAS trend: ${context.health.roas.direction}${context.health.roas.direction === "insufficient_data" ? " (no purchase-conversion data recorded for this campaign — either not enough history, or this campaign doesn't optimize for purchases)" : ""}

Account averages (across all your campaigns, last 7 days): CTR ${context.accountAverages.ctr?.toFixed(2) ?? "unavailable"}, spend ${context.accountAverages.spend?.toFixed(2) ?? "unavailable"}

Open opportunities already detected for this campaign: ${JSON.stringify(context.openOpportunities)}

Audience segments (age/gender CTR, if any): ${JSON.stringify(context.audienceSegments)}

Placement/device segments (publisher platform, position, device CTR, if any): ${JSON.stringify(context.placementSegments)}

Past decisions made about this same business, with their real reported outcomes (if any): ${JSON.stringify(context.pastDecisionOutcomes)}
${context.pastDecisionOutcomes.length > 0 ? "If relevant to the question, reference this real history explicitly — e.g. \"last time a similar recommendation was made, the reported outcome was X.\" Never claim history exists if this array is empty." : ""}

Past recommendations made specifically about THIS campaign, with real reported outcomes where available (outcome is null if never reported): ${JSON.stringify(context.pastCampaignRecommendations)}
If a past recommendation here has a real, non-null outcome and it's relevant to the current question, cite it explicitly — e.g. "last time I recommended X, you reported it worked/didn't work." Never claim an outcome exists for a past recommendation where outcome is null.

Real customer personas for this business, if researched (name and primary goal): ${JSON.stringify(context.personas)}
Real Knowledge Graph connections for these personas' goals (source, relationship, target, confidence) — if any exist, they represent a real, evidence-backed edge relevant to this business; cite them by name if genuinely relevant to the question, never invent a connection not present here: ${JSON.stringify(context.knowledgeGraphConnections)}

DATA AVAILABILITY — explicitly note these gaps in your limitations when relevant:
- Reach data: ${context.dataAvailability.hasReach ? "available" : "NOT available"}
- Frequency data: ${context.dataAvailability.hasFrequency ? "available" : "NOT available"}
- Budget data: ${context.dataAvailability.hasBudget ? "available" : "NOT available"}
- Audience breakdown data (age/gender): ${context.dataAvailability.hasAudienceData ? "available" : "NOT available"}
- Placement/device breakdown data: ${context.dataAvailability.hasPlacementData ? "available" : "NOT available"}
- Days of real daily history: ${context.dataAvailability.daysOfDailyHistory}
- Country/region breakdown: NEVER available in this system — always note if relevant
- Creative data (headlines, images, video): NEVER available in this system — always note if relevant
- Conversion/ROAS data: only captured for "purchase" events specifically — a campaign optimizing for leads, add-to-cart, or other action types will show no conversion data here even if it's genuinely performing well against its real goal. Note this scope limit explicitly if the campaign's objective isn't purchase-related.

USER QUESTION: ${question}`;
}

export const SUGGESTED_QUESTIONS = [
  "Why is this campaign performing the way it is?",
  "Should I increase the budget?",
  "What's my biggest optimization opportunity?",
  "Explain my health score",
  "Is this campaign ready to scale?",
];

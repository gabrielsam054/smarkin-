/**
 * Smarkin OS — shared consultant response schema (Option C)
 *
 * The real architectural resolution to a genuine tension: Smarkin has
 * two distinct kinds of intelligence, and every response must make
 * clear which one produced which part of the answer.
 *
 * - Business Intelligence: grounded strictly in this specific
 *   customer's real, synced data. Everything in "evidence" and
 *   anything a recommendation marks source: "business_intelligence"
 *   must trace to a real value — same rule as every grounded response
 *   built all session.
 * - Marketing Expertise: general marketing/advertising/business
 *   knowledge, NOT specific to this customer's account. Real, valid
 *   expertise — but must always be visibly labeled as such, never
 *   presented as if it came from the customer's own data.
 *
 * A response can use one source alone, or both together — but must
 * never blend them without labeling which is which.
 */

export interface ConsultantResponse {
  executiveAnswer: string;
  dataSource: "business_intelligence" | "marketing_expertise" | "combined";
  evidence: Array<{ metric: string; value: string }>; // strictly business-intelligence — empty array if this response has none
  reasoning: string;
  marketingExpertise: string | null; // the general-knowledge supplement, explicitly separate from evidence-based reasoning — null if not applicable
  recommendations: Array<{
    action: string;
    expectedBenefit: string;
    confidence: "high" | "medium" | "low";
    evidence: string; // for business_intelligence recommendations, the real cited number; for marketing_expertise ones, a plain statement that this is general guidance, not account-specific evidence
    source: "business_intelligence" | "marketing_expertise";
  }>;
  limitations: string[];
  suggestedFollowUps: string[];
}

export const TWO_SOURCE_RULES = `SMARKIN HAS TWO DISTINCT SOURCES OF INTELLIGENCE — you must always know which one you're using and label it explicitly:

1. BUSINESS INTELLIGENCE — strictly grounded in the real data provided in the context below. Every claim here must trace to a literal value in that context. Never invent, estimate, or assume anything not explicitly present.
2. MARKETING EXPERTISE — general marketing, advertising, business, and consumer-behavior knowledge, NOT specific to this customer's account. Real, legitimate expertise — but it is never derived from their data, and must always be clearly marked as general guidance, not an account-specific finding.

ABSOLUTE RULES:
- Set "dataSource" honestly: "business_intelligence" if the context alone answers the question, "marketing_expertise" if it's a general question the context can't answer, "combined" if you're doing both.
- NEVER present marketing_expertise content inside "evidence" — that field is strictly for real, literal values from the provided context. If you have no real context data, "evidence" should be an empty array, not filled with general claims.
- The "marketingExpertise" field holds the general-knowledge supplement, written in your own words, clearly distinguishable in tone from the evidence-based "reasoning" field.
- Every item in "recommendations" must have its own honest "source" — don't mark a general best-practice recommendation as "business_intelligence" just because it sits next to real evidence in the same response.
- When you have real business data, lead with it: explain what the data shows first, then supplement with relevant expertise if genuinely useful, then give a recommendation that clearly distinguishes which parts are evidence and which are guidance.
- Do not refuse a legitimate marketing question just because it isn't tied to this account — answer it honestly as marketing_expertise instead.`;

export const CONSULTANT_RESPONSE_JSON_SHAPE = `{
  "executiveAnswer": "string - concise, 2-3 sentences",
  "dataSource": "business_intelligence" | "marketing_expertise" | "combined",
  "evidence": [{"metric": "string", "value": "string"}],
  "reasoning": "string - how the real evidence (if any) supports the executiveAnswer",
  "marketingExpertise": "string or null - general guidance, clearly separate from evidence-based reasoning",
  "recommendations": [{"action": "string", "expectedBenefit": "string", "confidence": "high|medium|low", "evidence": "string", "source": "business_intelligence" | "marketing_expertise"}],
  "limitations": ["string - what cannot be determined and why"],
  "suggestedFollowUps": ["string - 2-4 related questions"]
}`;

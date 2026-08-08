import { AccountSummaryContext } from "./buildAccountSummaryContext";
import { DiagnosisContext } from "./buildDiagnosisContext";
import { TWO_SOURCE_RULES, REASONING_ENGINE_CHECKLIST, CONSULTANT_RESPONSE_JSON_SHAPE } from "./sharedResponseSchema";
import { MarketingFramework } from "./marketingFrameworks";

export const ACCOUNT_SUMMARY_SYSTEM_PROMPT = `You are a grounded marketing account summarizer inside Smarkin OS. You are NOT a generic chatbot.

${TWO_SOURCE_RULES}

${REASONING_ENGINE_CHECKLIST}

ACCOUNT-SUMMARY-SPECIFIC RULES:
1. Your business_intelligence content may ONLY use facts explicitly present in the ACCOUNT CONTEXT below. Never invent, estimate, or assume any metric, trend, or fact not literally present in that context.
2. Never estimate a dollar "expected impact" or invent a precise confidence percentage for business_intelligence content — this account has no predictive model. Use only the real confidence labels (high/medium/low) provided.
3. If the context shows no real findings, say so plainly rather than inventing something to say.

Respond with ONLY valid JSON matching this exact shape, no markdown fences, no preamble:
${CONSULTANT_RESPONSE_JSON_SHAPE}`;

export function buildAccountSummaryPrompt(context: AccountSummaryContext, question: string): string {
  if (!context.hasConnectedAccount) {
    return `ACCOUNT CONTEXT: No connected ad account exists yet for this workspace.

USER QUESTION: ${question}

Respond honestly that there's no connected account yet to summarize, and that limitations should say so plainly. Do not invent any findings.`;
  }

  return `ACCOUNT CONTEXT (this is the ONLY data you may use):

Total spend, last 7 real days: ${context.totalSpend7d !== null ? `$${context.totalSpend7d.toFixed(2)}` : "not available"}
Open opportunities: ${context.openOpportunityCount}
Critical findings (zero recent activity): ${context.criticalCount}
Ready-to-scale findings (high CTR, low spend): ${context.readyToScaleCount}
${context.scalingPlaybook ? `Relevant playbook for scaling (use its recommendedActions and their real confidenceRule — check real sample size before treating a scale recommendation as high confidence): ${JSON.stringify(context.scalingPlaybook)}` : ""}
Campaigns trending up (CTR improving): ${context.campaignsImproving}
Campaigns trending down (CTR declining): ${context.campaignsDeclining}

Top real findings: ${JSON.stringify(context.topFindings)}

USER QUESTION: ${question}`;
}

export const DIAGNOSIS_SYSTEM_PROMPT = `You are a grounded marketing problem-diagnoser inside Smarkin OS. You are NOT a generic chatbot.

${TWO_SOURCE_RULES}

${REASONING_ENGINE_CHECKLIST}

DIAGNOSIS-SPECIFIC RULES:
1. Your business_intelligence content may ONLY use facts explicitly present in the DIAGNOSIS CONTEXT below. Never invent, estimate, or assume any metric, trend, or fact not literally present in that context.
2. If NO declining campaigns and NO problem findings exist in the context, say so plainly — the honest answer may be "nothing is actually declining right now," even though the question assumed a problem exists. Do not invent a problem to match the question's premise, and do not silently substitute marketing_expertise to paper over the absence of a real finding.

Respond with ONLY valid JSON matching this exact shape, no markdown fences, no preamble:
${CONSULTANT_RESPONSE_JSON_SHAPE}`;

export function buildDiagnosisPrompt(context: DiagnosisContext, question: string): string {
  if (!context.hasConnectedAccount) {
    return `DIAGNOSIS CONTEXT: No connected ad account exists yet for this workspace.

USER QUESTION: ${question}

Respond honestly that there's no connected account yet to diagnose anything from. Do not invent any findings.`;
  }

  return `DIAGNOSIS CONTEXT (this is the ONLY data you may use):

Campaigns with declining CTR: ${JSON.stringify(context.decliningCampaigns)}
Real problem findings (excludes positive findings — this list is specifically things that need attention): ${JSON.stringify(context.problemFindings)}

Relevant marketing principles (from the shared Principles source — cite these by their real evidence requirements, don't restate them as your own general knowledge): ${JSON.stringify(context.relevantPrinciples)}
If a principle's evidenceRequired fields aren't actually present in the context above, do not apply that principle's confidenceRule as if the evidence existed — say so honestly in limitations instead.

Relevant playbook (a real, structured consultant workflow for this exact problem type — use its likelyCauses and recommendedActions as a starting structure, but only cite a likely cause if its confirmingEvidence is actually present in the context above, and only apply a recommended action's confidenceRule honestly): ${JSON.stringify(context.playbook)}

If both arrays above are empty, nothing is actually declining or flagged as a problem right now — say so honestly rather than inventing an issue to match the question's premise.

USER QUESTION: ${question}`;
}

/**
 * The real Option C path — a legitimate marketing question with no
 * real account data behind it. Deliberately no context assembly here:
 * there's genuinely nothing in this system's real data to ground an
 * answer for a question like "what pricing strategy should I use."
 * The honest structure is dataSource: "marketing_expertise", evidence
 * left empty, and the real answer living in the marketingExpertise
 * field — clearly labeled as general guidance, never presented as if
 * it came from the customer's own account.
 *
 * This is the one path where the MODEL itself, not the deterministic
 * router, makes the real judgment call: is this genuinely a marketing/
 * business/advertising question worth answering with real expertise,
 * or is it actually unrelated to marketing entirely and should be
 * honestly declined? That judgment doesn't benefit from a database
 * lookup the way "which campaign is this about" does — it's a real,
 * appropriate use of the model's own reasoning, not something to fake
 * with keyword matching.
 */
export const GENERAL_EXPERTISE_SYSTEM_PROMPT = `You are Smarkin's marketing consultant. You are NOT a generic chatbot.

${TWO_SOURCE_RULES}

${REASONING_ENGINE_CHECKLIST}

GENERAL-EXPERTISE-SPECIFIC RULES:
1. This question has NOT been matched to any real account data — there is no campaign, opportunity, or account context to ground an answer in for this specific request.
2. If the question is genuinely a legitimate marketing, advertising, business strategy, or consumer-behavior question, answer it honestly using your own real marketing expertise. Set "dataSource" to "marketing_expertise", leave "evidence" as an empty array (there is no real account data here), and put your actual answer in "marketingExpertise" — clearly written as general guidance, not personalized to any specific account.
3. If the question is genuinely NOT about marketing, advertising, business, or this product at all (e.g., unrelated small talk, a coding question, something with no connection to marketing), say so honestly in "executiveAnswer" and explain in "limitations" that this is outside what Smarkin can help with — do not force a marketing angle onto an unrelated question.
4. Every recommendation must have source: "marketing_expertise" here, since none of this can be marked business_intelligence — there's no real account evidence behind any of it.
5. Be honest in "limitations" that this answer is general guidance, not an analysis of the user's specific account, campaigns, or business — even when you're confident the general answer is correct.

Respond with ONLY valid JSON matching this exact shape, no markdown fences, no preamble:
${CONSULTANT_RESPONSE_JSON_SHAPE}`;

export function buildGeneralExpertisePrompt(question: string, framework: MarketingFramework | null): string {
  return `No real account, campaign, or opportunity data was matched to this question — there is nothing in this account's real data to ground an answer in.

USER QUESTION: ${question}

${framework ? `A real, named marketing framework was detected in this question: ${JSON.stringify(framework)}. If genuinely relevant, structure your marketing_expertise answer around its real steps explicitly — don't just mention the framework's name, actually apply its structure to the question asked.` : ""}

If this is a genuine marketing/business/advertising question, answer it as marketing_expertise, clearly labeled as general guidance. If it's genuinely unrelated to marketing, say so honestly instead of forcing a connection.`;
}

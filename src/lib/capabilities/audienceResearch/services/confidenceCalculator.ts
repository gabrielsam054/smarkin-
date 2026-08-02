/**
 * Same discipline as Customer Research's confidenceCalculator.ts and
 * decisionEngine.ts's channelConfidence: score reflects the real ratio of
 * sections that actually found matches, not a fixed or asserted number.
 */
export interface AudienceConfidenceInputs {
  audienceCount: number;
  interestCount: number;
  behaviorCount: number;
  demographicCount: number;
  platformCount: number;
  strategyCount: number;
  gapCount: number;
}

export function calculateAudienceConfidence(inputs: AudienceConfidenceInputs): number {
  let score = 0;
  let maxScore = 0;

  maxScore += 25; score += Math.min(25, inputs.audienceCount * 12.5);
  maxScore += 20; score += Math.min(20, inputs.interestCount * 4);
  maxScore += 15; score += Math.min(15, inputs.behaviorCount * 5);
  maxScore += 20; score += Math.min(20, inputs.demographicCount * 4);
  maxScore += 10; score += Math.min(10, inputs.platformCount * 2);
  maxScore += 10; score += Math.min(10, inputs.strategyCount * 2);

  const rawScore = Math.round((score / maxScore) * 100);
  const gapPenalty = Math.min(20, inputs.gapCount * 2);

  return Math.max(0, Math.min(100, rawScore - gapPenalty));
}

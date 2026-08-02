/**
 * Confidence Calculator — scores overall research confidence based on how
 * many of the expected data sections actually produced real matches, not a
 * fixed or asserted number. Same "confidence reflects real match ratio, not
 * a vibe" discipline as decisionEngine.ts's channelConfidence.
 */
export interface ConfidenceInputs {
  personaCount: number;
  painPointCount: number;
  objectionCount: number;
  languageRowsUsed: number;
  journeyStagesWithData: number; // out of 4
  gapCount: number;
}

export function calculateConfidence(inputs: ConfidenceInputs): number {
  let score = 0;
  let maxScore = 0;

  maxScore += 30; score += Math.min(30, inputs.personaCount * 15); // up to 2 personas fully credited
  maxScore += 20; score += Math.min(20, inputs.painPointCount * 10);
  maxScore += 15; score += Math.min(15, inputs.objectionCount * 7.5);
  maxScore += 15; score += Math.min(15, inputs.languageRowsUsed * 3);
  maxScore += 20; score += (inputs.journeyStagesWithData / 4) * 20;

  const rawScore = Math.round((score / maxScore) * 100);

  // Every logged gap represents a section that honestly returned less than
  // requested — a real, direct penalty, not decorative.
  const gapPenalty = Math.min(20, inputs.gapCount * 2);

  return Math.max(0, Math.min(100, rawScore - gapPenalty));
}

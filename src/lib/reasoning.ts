/**
 * Matches the v16 reasoning_steps schema exactly (step_type enum,
 * migration 024) — not an invented shape. When Phase 1's chain-emission
 * work ships and engines actually write these rows, this type is
 * already correct; nothing here needs to change to consume real data.
 */
export type ReasoningStepType =
  | "observation" | "classification" | "pattern_match" | "memory_recall"
  | "diagnosis" | "goal_alignment" | "confidence_adjustment" | "conclusion";

export interface ReasoningStep {
  seq: number;
  stepType: ReasoningStepType;
  engine: string;
  statement: string;
  confidence: number;
  evidenceRefs: string[];
}

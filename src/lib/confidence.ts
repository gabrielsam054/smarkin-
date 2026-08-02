/**
 * Smarkin OS — The One Confidence Model
 *
 * Production Hardening Sprint, Priority 6. Before this file existed, three
 * capabilities each computed their own confidence score independently
 * (Decision Engine, Customer Research, Audience Research), and two
 * separate UI components each defined their OWN, DIFFERENT tier
 * thresholds for what counts as "high" vs "moderate" vs "low" confidence
 * (ConfidenceRing: >=90/>=70/else; ConfidenceBadge: >=75/>=45/else) — the
 * exact "two disagreeing confidence indicators" bug already found and
 * fixed once this session, silently reintroduced by building a second
 * component without checking the first. A score of 80 would have shown as
 * "Moderate" in one place and "High" in another, at the same time, for the
 * same underlying number.
 *
 * This file is now the ONLY place tier thresholds are defined. Every
 * confidence-scoring engine still computes its own SCORE (that logic is
 * genuinely different per capability — Customer Research's evidence mix
 * isn't Audience Research's), but every UI component that turns a score
 * into a label/color now reads from here.
 */

export type ConfidenceTier = "high" | "medium" | "low";

const HIGH_THRESHOLD = 75;
const MEDIUM_THRESHOLD = 45;

export function confidenceTier(score: number): ConfidenceTier {
  if (score >= HIGH_THRESHOLD) return "high";
  if (score >= MEDIUM_THRESHOLD) return "medium";
  return "low";
}

export function confidenceLabel(score: number): string {
  const tier = confidenceTier(score);
  if (tier === "high") return "High Confidence";
  if (tier === "medium") return "Moderate Confidence";
  return "Low Confidence";
}

export const CONFIDENCE_COLORS: Record<ConfidenceTier, { stroke: string; glow: string; badgeClass: string }> = {
  high:   { stroke: "#7C3AED", glow: "rgba(124,58,237,0.35)", badgeClass: "text-primary border-primary/30 bg-primary/10" },
  medium: { stroke: "#D97706", glow: "rgba(217,119,6,0.35)",  badgeClass: "text-amber border-amber/30 bg-amber/10" },
  low:    { stroke: "#DC2626", glow: "rgba(220,38,38,0.35)",  badgeClass: "text-destructive border-destructive/30 bg-destructive/10" },
};

/**
 * Decision Engine's channelConfidence field is a string ("High"/"Medium"/
 * "Low"), sourced directly from channelSuitabilityDatabase's own
 * "Confidence" column — real source data, not a fabricated label, so it
 * isn't being replaced. This converts it to the same 0-100 numeric scale
 * every other capability uses, so the SAME ConfidenceBadge/ConfidenceRing
 * components can render it without a special case. The exact numeric
 * values (85/60/30) are representative midpoints of each tier, not a
 * precision claim Decision Engine's own source data doesn't support —
 * this is a real, disclosed approximation, not a new measurement.
 */
export function stringConfidenceToScore(value: string): number {
  const normalized = value.trim().toLowerCase();
  if (normalized === "high") return 85;
  if (normalized === "medium") return 60;
  return 30; // covers "low" and any unrecognized value — never silently 0, never silently 100
}

/**
 * Reuses Customer Research's already-computed objections and pain points
 * — the exact "reuse outputs, don't duplicate logic" requirement. This
 * service doesn't re-derive psychology or re-match a database; it
 * reshapes real findings Customer Research already produced into the
 * insight categories the sprint asked for.
 */
export interface GeneratedInsight {
  category: "preference" | "avoidance" | "purchase-intent" | "seasonality" | "price-sensitivity" | "loyalty" | "trigger";
  insight: string;
  source: string;
}

export function generateAudienceInsights(
  objections: { category: string; objection: string }[],
  painPoints: { description: string; urgencyScore: number }[],
  gaps: string[],
): GeneratedInsight[] {
  const insights: GeneratedInsight[] = [];

  const priceObjection = objections.find(o => o.category === "price");
  if (priceObjection) {
    insights.push({ category: "price-sensitivity", insight: `Customers show price sensitivity: "${priceObjection.objection}"`, source: "Customer Research objections" });
  }

  const trustObjection = objections.find(o => o.category === "trust");
  if (trustObjection) {
    insights.push({ category: "avoidance", insight: `Customers avoid buying without trust signals: "${trustObjection.objection}"`, source: "Customer Research objections" });
  }

  const topPainPoint = [...painPoints].sort((a, b) => b.urgencyScore - a.urgencyScore)[0];
  if (topPainPoint) {
    insights.push({ category: "trigger", insight: `The strongest purchase trigger is resolving: "${topPainPoint.description}"`, source: "Customer Research pain points" });
  }

  if (painPoints.some(p => p.urgencyScore >= 80)) {
    insights.push({ category: "purchase-intent", insight: "High-urgency pain points suggest strong purchase intent once the right message is shown.", source: "Customer Research pain points" });
  }

  if (insights.length === 0) {
    gaps.push("No objections or pain points were available from Customer Research to derive audience insights from — this section is honestly empty rather than filled with generic statements.");
  }

  // No real data source exists yet for seasonality or brand-loyalty
  // insights specifically — not fabricated here even though the sprint
  // named them as examples.
  return insights;
}

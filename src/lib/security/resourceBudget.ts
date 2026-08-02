/**
 * Smarkin Security — Resource Budgets (extension point, not enforcement yet)
 *
 * SmarkinService gains an optional resourceBudget field. Advertising
 * declares none, because the entire Decision Engine path is deterministic —
 * zero Claude/LLM calls exist anywhere in decisionEngine.ts, channelAdapters.ts,
 * or executionBriefGenerator.ts, confirmed directly this phase and last. This
 * check becomes real, enforced behavior only once a future AI capability
 * actually sets maxTokens or maxCostUnits; today it's structurally present
 * and provably a no-op for the one capability that exists.
 */
export interface ResourceBudget {
  maxDurationMs?: number;
  maxTokens?: number;
  maxCostUnits?: number;
}

export interface ResourceUsage {
  durationMs?: number;
  tokens?: number;
  costUnits?: number;
}

export function checkResourceBudget(
  budget: ResourceBudget | undefined,
  usage: ResourceUsage,
): { withinBudget: boolean; exceeded?: string } {
  if (!budget) return { withinBudget: true };
  if (budget.maxDurationMs !== undefined && (usage.durationMs ?? 0) > budget.maxDurationMs) {
    return { withinBudget: false, exceeded: "maxDurationMs" };
  }
  if (budget.maxTokens !== undefined && (usage.tokens ?? 0) > budget.maxTokens) {
    return { withinBudget: false, exceeded: "maxTokens" };
  }
  if (budget.maxCostUnits !== undefined && (usage.costUnits ?? 0) > budget.maxCostUnits) {
    return { withinBudget: false, exceeded: "maxCostUnits" };
  }
  return { withinBudget: true };
}

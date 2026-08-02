/**
 * Produces a lightweight, generic summary of a service's output — never the
 * full payload. Deliberately shape-agnostic: it has no idea what a
 * DecisionResult or a BusinessIntelligenceProfile specifically look like,
 * which is what keeps marketing knowledge out of the diagnostics layer,
 * matching "the Brain never contains marketing logic" applied one level
 * further down.
 *
 * Rule: primitives pass through (strings truncated), arrays become a
 * length, nested objects become a placeholder — one level deep, never a
 * recursive dump of the real payload.
 */
export function summarizeOutput(output: unknown): Record<string, unknown> {
  if (output === null || output === undefined) return { type: "null" };
  if (typeof output !== "object") return { type: typeof output, value: String(output).slice(0, 100) };
  if (Array.isArray(output)) return { type: "array", length: output.length };

  const summary: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(output as Record<string, unknown>)) {
    if (value === null || value === undefined) {
      summary[key] = null;
    } else if (typeof value === "string") {
      summary[key] = value.length > 80 ? `${value.slice(0, 80)}...` : value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      summary[key] = value;
    } else if (Array.isArray(value)) {
      summary[key] = `[array, length=${value.length}]`;
    } else if (typeof value === "object") {
      summary[key] = "[object]";
    }
  }
  return summary;
}

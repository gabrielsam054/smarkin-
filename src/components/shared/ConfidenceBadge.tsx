import { Sparkles } from "lucide-react";
import { confidenceTier } from "@/lib/confidence";

/**
 * Color and label are BOTH derived from the same score — this fixes the
 * exact "two disagreeing confidence indicators" bug found earlier this
 * session (a badge and a ring showing different labels for the same
 * number). There is exactly one source of truth per instance: the score
 * passed in. Tier thresholds now come from lib/confidence.ts — the single
 * shared model — rather than being duplicated inline here; ConfidenceRing
 * reads from the exact same function.
 */
export function ConfidenceBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" }) {
  const tier = confidenceTier(score);
  const styles = {
    high:   "bg-primary/10 border-primary/20 text-primary",
    medium: "bg-amber/10 border-amber/20 text-amber",
    low:    "bg-destructive/10 border-destructive/20 text-destructive",
  }[tier];
  const padding = size === "sm" ? "px-2 py-1" : "px-3 py-1.5";
  const iconSize = size === "sm" ? 12 : 13;
  const textSize = size === "sm" ? "text-[11px]" : "text-xs";

  return (
    <div className={`inline-flex items-center gap-1.5 border rounded-full ${padding} ${styles}`}>
      <Sparkles size={iconSize} aria-hidden="true" />
      <span className={`${textSize} font-medium`}>{score} confidence</span>
    </div>
  );
}

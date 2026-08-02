import { JourneyStage } from "@/lib/capabilities/customerResearch/types";

/**
 * Extracted from research/[id]/page.tsx. Also the building block for a
 * future generic Timeline component (Phase 10's ExecutionTrace rendering
 * shares the same "ordered stage cards in a row" shape) — kept here as its
 * own component now rather than prematurely generalized before a second
 * real use case exists to prove the abstraction is right.
 */
export function JourneyStageCard({ stage }: { stage: JourneyStage }) {
  return (
    <div className="flex-1 border border-border rounded-sm p-3 flex flex-col gap-2 min-w-[180px]">
      <p className="text-[10px] font-mono uppercase tracking-wide text-primary">{stage.stage}</p>
      <p className="text-xs text-text-secondary">{stage.customerMindset ?? "No data available for this stage"}</p>
      {stage.keyMessage && <p className="text-xs text-text-primary border-t border-border pt-2 mt-1">{stage.keyMessage}</p>}
      {stage.recommendedCTA && <p className="text-[11px] font-mono text-text-muted">{stage.recommendedCTA}</p>}
    </div>
  );
}

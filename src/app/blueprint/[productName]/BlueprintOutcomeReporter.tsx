"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Clock } from "lucide-react";
import { reportBlueprintOutcome } from "./blueprintActions";

export function BlueprintOutcomeReporter({ blueprintId }: { blueprintId: string }) {
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);

  async function handleReport(outcome: "worked" | "did_not_work" | "too_early_to_tell") {
    if (reporting) return;
    setReporting(true);
    const result = await reportBlueprintOutcome(blueprintId, outcome);
    setReporting(false);
    if (!result.error) setReported(true);
  }

  if (reported) {
    return <p className="text-xs text-primary">Thanks — this will inform future blueprints for this product.</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <p className="text-[11px] text-text-muted">Did the campaign built from this work?</p>
      <button type="button" disabled={reporting} onClick={() => handleReport("worked")}
        className="text-[11px] flex items-center gap-1 text-text-secondary hover:text-primary transition-colors disabled:opacity-50">
        <ThumbsUp size={11} /> Worked
      </button>
      <button type="button" disabled={reporting} onClick={() => handleReport("did_not_work")}
        className="text-[11px] flex items-center gap-1 text-text-secondary hover:text-destructive transition-colors disabled:opacity-50">
        <ThumbsDown size={11} /> Didn&apos;t work
      </button>
      <button type="button" disabled={reporting} onClick={() => handleReport("too_early_to_tell")}
        className="text-[11px] flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50">
        <Clock size={11} /> Too early
      </button>
    </div>
  );
}

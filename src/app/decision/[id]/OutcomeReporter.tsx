"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { reportDecisionOutcome } from "./actions";

interface OutcomeReporterProps {
  decisionResultId: string;
  existingOutcome: "worked" | "did_not_work" | "too_early_to_tell" | null;
}

const OPTIONS = [
  { value: "worked" as const, label: "It worked", icon: CheckCircle2 },
  { value: "did_not_work" as const, label: "It didn't work", icon: XCircle },
  { value: "too_early_to_tell" as const, label: "Too early to tell", icon: Clock },
];

export function OutcomeReporter({ decisionResultId, existingOutcome }: OutcomeReporterProps) {
  const [isPending, startTransition] = useTransition();
  const [reported, setReported] = useState(existingOutcome);
  const [error, setError] = useState<string | null>(null);

  const handleReport = (outcome: "worked" | "did_not_work" | "too_early_to_tell") => {
    setError(null);
    startTransition(async () => {
      const result = await reportDecisionOutcome(decisionResultId, outcome);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setReported(outcome);
    });
  };

  if (reported) {
    const opt = OPTIONS.find(o => o.value === reported);
    return (
      <div className="flex items-center gap-2 text-xs text-text-muted">
        {opt && <opt.icon size={13} className="text-primary" />}
        <span>Marked as &ldquo;{opt?.label}&rdquo; — this is the first real data feeding Smarkin&apos;s Learning Engine.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-text-muted">Did this recommendation actually work for you?</p>
      <div className="flex gap-2 flex-wrap">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            disabled={isPending}
            onClick={() => handleReport(value)}
            className="flex items-center gap-1.5 text-xs font-medium text-text-secondary border border-border rounded-full px-3 py-1.5 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

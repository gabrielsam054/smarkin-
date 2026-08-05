"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { dismissOpportunity } from "./actions";

export function DismissButton({ opportunityId }: { opportunityId: string }) {
  const [dismissing, setDismissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDismiss() {
    setDismissing(true);
    setError(null);
    const result = await dismissOpportunity(opportunityId);
    setDismissing(false);
    if (result.error) setError(result.error);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDismiss}
        disabled={dismissing}
        className="text-text-muted hover:text-text-primary transition-colors disabled:opacity-50 flex-none"
        aria-label="Dismiss opportunity"
      >
        <X size={14} />
      </button>
      {error && <span className="text-[11px] text-destructive">{error}</span>}
    </div>
  );
}

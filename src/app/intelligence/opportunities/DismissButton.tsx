"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { dismissOpportunity } from "./actions";

export function DismissButton({ opportunityId }: { opportunityId: string }) {
  const [dismissing, setDismissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDismiss(e: React.MouseEvent) {
    // Real fix for a real crash: this button now sits inside a Link
    // (the campaign-link audit fix), so clicking it would otherwise
    // also trigger navigation. Handled here, safely, since this
    // component is already a real Client Component — the previous
    // version tried to do this from a raw onClick wrapper defined
    // directly in the Server Component page, which isn't valid at all
    // and is what actually crashed the page.
    e.preventDefault();
    e.stopPropagation();
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

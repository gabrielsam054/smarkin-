"use client";

import { useEffect } from "react";
import { RefreshCcw } from "lucide-react";

/**
 * Next.js App Router convention file. Per UX Spec Phase 5: distinguishes
 * "failed" (this boundary — offers retry) from "not found" (handled by
 * not-found.tsx, a separate convention file — not built this feature,
 * since it needs no shared UI beyond a simple message and isn't listed
 * as a Phase 1 item).
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Real error boundary should report to the existing operational_errors
    // pipeline (established this session) once wired to a client-safe
    // logging endpoint — not done here, since that requires knowing the
    // real logger's client-callable surface, which isn't available in
    // this reset sandbox. Flagged rather than guessed.
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm text-center flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
          <RefreshCcw size={18} />
        </div>
        <p className="text-sm font-semibold text-text-primary">Something went wrong</p>
        <p className="text-xs text-text-muted">
          This page failed to load. You can try again, or head back to Mission Control.
        </p>
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={reset}
            className="text-xs font-semibold bg-primary text-primary-foreground rounded-lg px-3 py-2 hover:bg-primary-dim transition-colors"
          >
            Try again
          </button>
          <a href="/dashboard" className="text-xs font-semibold text-text-secondary hover:text-text-primary px-3 py-2">
            Go to Mission Control
          </a>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Silently refreshes the report page every few seconds while Claude's
 * narrative enrichment is still running in the background (see the after()
 * call in analysis/new/actions.ts). Renders a small, unobtrusive badge so the
 * user knows more detail is on the way, then removes itself once the
 * narrative fields have landed — no manual reload needed.
 *
 * Usage: render <AIEnrichmentPoller pending={result.explainability?.aiEnrichmentPending} />
 * near the top of the report page. It's a no-op once pending is false/undefined.
 */
export function AIEnrichmentPoller({ pending }: { pending?: boolean }) {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 15; // ~30s at 2s intervals — Claude enrichment normally finishes well inside this
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!pending) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    if (attempts >= maxAttempts) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setAttempts((a: number) => a + 1);
      router.refresh();
    }, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, attempts]);

  if (!pending || attempts >= maxAttempts) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-text-muted bg-surface border border-border rounded-full px-3 py-1.5 w-fit">
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      Generating AI strategy insights...
    </div>
  );
}

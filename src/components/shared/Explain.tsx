"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HelpCircle, X, Clock } from "lucide-react";
import { EvidencePanel, Evidence } from "@/components/domain/EvidencePanel";
import { ReasoningStep } from "@/lib/reasoning";

/**
 * Self-contained trigger + drawer (UX Spec Phase 3: ExplainDrawer,
 * Phase 6 §6 "Explain, everywhere"). Deliberately owns its own open
 * state and trigger ref internally rather than requiring every call
 * site to wire up open/close/focus-return manually — that duplication
 * across dozens of "?" usages is exactly what "No duplicated logic"
 * (Development Standards) rules out.
 *
 * Composes the EXISTING EvidencePanel rather than re-implementing
 * evidence rendering — per "reuse existing components whenever
 * possible." EvidencePanel already handles verified-sources-visible +
 * expandable technical detail; this drawer only adds the chain trace
 * on top when one is available.
 */
export function Explain({
  claimLabel, evidence, gaps, chain,
}: {
  claimLabel: string;
  evidence: Evidence[];
  gaps?: string[];
  /** Omit entirely for reports created before chain-emission shipped —
   *  renders the honest "not available for older reports" state below,
   *  never a broken fetch or a fabricated trace. */
  chain?: ReasoningStep[];
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  function close() {
    setOpen(false);
    // Focus returns to the trigger that opened it — stated as a hard
    // requirement in the UX Spec's ExplainDrawer a11y row, not optional.
    triggerRef.current?.focus();
  }

  // Real focus trap + Esc-to-close, per UX Spec Phase 5 ("Esc closes any
  // open overlay — universal rule") and Phase 3's a11y requirement.
  useEffect(() => {
    if (!open) return;

    const drawer = drawerRef.current;
    const focusable = drawer?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Explain: ${claimLabel}`}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-text-muted hover:text-primary hover:bg-primary/10 transition-colors align-middle"
      >
        <HelpCircle size={13} />
      </button>

      {open && (
        <div className="fixed inset-0 z-30" role="presentation">
          <div
            className="absolute inset-0 bg-text-primary/20"
            onClick={close}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute right-0 top-0 h-full w-full sm:w-96 bg-surface border-l border-border shadow-drawer overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface">
              <h2 id={titleId} className="text-sm font-semibold text-text-primary pr-4">{claimLabel}</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="text-text-muted hover:text-text-primary flex-none"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-5">
              <EvidencePanel evidence={evidence} gaps={gaps} />

              <div>
                <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">Reasoning</p>
                {chain && chain.length > 0 ? (
                  <ReasoningTrace steps={chain} />
                ) : (
                  // Chain-pending state, per UX Spec: honest mechanism
                  // statement, not a broken fetch or an empty box.
                  <div className="flex items-start gap-2 text-xs text-text-muted rounded-lg border border-border p-3">
                    <Clock size={13} className="flex-none mt-0.5" />
                    <span>Reasoning trace not available for reports created before chain tracking shipped.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ReasoningTrace({ steps }: { steps: ReasoningStep[] }) {
  // Chain confidence = MIN across links (2.1/3.0 rule) — visibly showing
  // which link bounds the whole chain is "often the most useful thing a
  // user learns" per the 3.0 design, so it's called out explicitly here
  // rather than left for the reader to compute themselves. Found by
  // scanning for the minimum directly, not by assuming `seq` aligns to
  // array index (fragile if steps ever arrive unsorted or non-1-indexed).
  const weakestStep = steps.reduce((min, s) => (s.confidence < min.confidence ? s : min), steps[0]);

  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, i) => (
        <li key={step.seq} className="flex gap-3">
          <div className="flex flex-col items-center flex-none pt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {i < steps.length - 1 && <span className="w-px flex-1 bg-border mt-1" />}
          </div>
          <div className="pb-1">
            <p className="text-[10px] font-mono uppercase tracking-wide text-text-muted">{step.stepType}</p>
            <p className="text-xs text-text-secondary mt-0.5">{step.statement}</p>
            <p className={`text-[11px] font-mono mt-0.5 ${step === weakestStep ? "text-amber font-semibold" : "text-text-muted"}`}>
              {step.confidence}%{step === weakestStep ? " — bounds this chain's overall confidence" : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

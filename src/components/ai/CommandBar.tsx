"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Command } from "lucide-react";
import { matchCommand } from "./commandRouter";

/**
 * Dispatches free text to a REGISTERED capability's route. Never calls an
 * LLM here, never holds a conversation — matching "the command bar should
 * dispatch requests to registered capabilities" exactly. Submitting always
 * ends at a real route (/research/new or /decision/new today), never at a
 * generated chat reply rendered in place.
 */
export function CommandBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const openPalette = useCallback(() => {
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const isShortcut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isShortcut) {
        e.preventDefault();
        openPalette();
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [openPalette]);

  const { matched, suggestions } = matchCommand(value);

  function dispatch(route?: string) {
    const destination = route ?? matched?.route;
    if (!destination) return;
    router.push(destination);
    setOpen(false);
    setValue("");
  }

  return (
    <>
      {/* The permanent, inline bar — always visible, not just the ⌘K overlay */}
      <button
        type="button"
        onClick={openPalette}
        className="w-full flex items-center gap-3 bg-surface border border-border rounded-lg px-4 py-3.5 text-left hover:border-border-strong transition-colors group"
      >
        <Sparkles size={16} className="text-primary flex-none" aria-hidden="true" />
        <span className="text-sm text-text-muted flex-1">Ask Smarkin anything — &ldquo;Research my customers&rdquo;, &ldquo;Launch a campaign&rdquo;</span>
        <span className="hidden sm:flex items-center gap-0.5 text-[11px] font-mono text-text-muted border border-border rounded px-1.5 py-0.5 flex-none">
          <Command size={10} aria-hidden="true" />K
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1500] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <div
            className="w-full max-w-xl bg-surface border border-border-strong rounded-xl shadow-card-hover overflow-hidden"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
              <Sparkles size={16} className="text-primary flex-none" aria-hidden="true" />
              <input
                ref={inputRef}
                value={value}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") dispatch(); }}
                placeholder="Ask Smarkin anything..."
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
                autoComplete="off"
              />
            </div>

            <div className="max-h-80 overflow-y-auto py-2">
              {matched ? (
                <button
                  onClick={() => dispatch(matched.route)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2 transition-colors"
                >
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-none">
                    <ArrowRight size={13} className="text-primary" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">{matched.label}</p>
                    <p className="text-xs text-text-muted truncate">Routes to {matched.route}</p>
                  </div>
                </button>
              ) : (
                <>
                  <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide px-4 py-1.5">
                    {value ? "No exact match — real capabilities available" : "Available capabilities"}
                  </p>
                  {suggestions.map(s => (
                    <button
                      key={s.capability}
                      onClick={() => dispatch(s.route)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-md bg-surface-2 flex items-center justify-center flex-none">
                        <ArrowRight size={13} className="text-text-muted" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary">{s.label}</p>
                        <p className="text-xs text-text-muted truncate">e.g. &ldquo;{s.examples[0]}&rdquo;</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

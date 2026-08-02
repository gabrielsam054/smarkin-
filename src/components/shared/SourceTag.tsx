/**
 * The evidence-forward signature element from the Customer Research
 * design — every finding carries its real provenance directly on the
 * card, monospace, small, never hidden behind a hover state. Extracted
 * from research/[id]/page.tsx where it was originally defined inline;
 * generic enough for any capability that needs to show a data source.
 */
export function SourceTag({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono text-text-muted bg-surface-2 border border-border rounded-full px-2 py-0.5">
      {source}
    </span>
  );
}

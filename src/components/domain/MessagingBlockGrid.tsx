export interface MessagingBlock {
  label: string;
  value: string;
}

/**
 * Extracted from the compact-info-block pattern already established
 * inline on the Customer Research report's Messaging Strategy section
 * (grid of label+value cards for Headline/Offer/Positioning/CTA). That
 * page's copy of this pattern is NOT touched by this feature — it
 * wasn't available to verify in this reset sandbox, and reconstructing
 * it blindly risks the same class of break as the audience-page
 * incident earlier in this project. Flagged as a clean follow-up: that
 * page's inline version should migrate to this shared component once
 * it can be diffed against safely.
 *
 * Renders nothing if given an empty array — never an empty grid of
 * blank cards.
 */
export function MessagingBlockGrid({ blocks }: { blocks: MessagingBlock[] }) {
  if (blocks.length === 0) return null;

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {blocks.map((b, i) => (
        <div key={i} className="rounded-lg border border-border p-4">
          <p className="text-xs text-text-muted uppercase tracking-wide mb-1.5">{b.label}</p>
          <p className="text-sm text-text-primary">{b.value}</p>
        </div>
      ))}
    </div>
  );
}

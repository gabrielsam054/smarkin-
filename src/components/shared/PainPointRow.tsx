import { PainPoint } from "@/lib/capabilities/customerResearch/types";
import { SourceTag } from "./SourceTag";
import { UrgencyBar } from "./UrgencyBar";

/** Extracted from research/[id]/page.tsx, where it was originally defined inline. */
export function PainPointRow({ pain }: { pain: PainPoint }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary">{pain.description}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] uppercase tracking-wide text-text-muted">{pain.category.replace("-", " ")}</span>
          <SourceTag source={pain.source} />
        </div>
      </div>
      <UrgencyBar score={pain.urgencyScore} />
    </div>
  );
}

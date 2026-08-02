import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ConfidenceBadge } from "@/components/shared/ConfidenceBadge";

/**
 * One card, one real research asset. Every count here must be derivable
 * from CustomerResearchResult's actual arrays — the caller computes them
 * (personas.length, painPoints.length, etc.), this component never invents
 * a number on its own. No fake data, per the sprint's own requirement.
 */
export interface ResearchAssetSummary {
  businessName: string;
  version: number;
  confidence: number;
  createdAt: string;
  personaCount: number;
  painPointCount: number;
  motivationCount: number;
  audienceSignalCount: number; // real search/language signals, not a fabricated "audience" concept — see the card's own label
  messagingCount: number;
  href: string;
}

function relativeDay(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ResearchAssetCard({ asset }: { asset: ResearchAssetSummary }) {
  const stats = [
    { label: "Personas", value: asset.personaCount },
    { label: "Pain Points", value: asset.painPointCount },
    { label: "Motivations", value: asset.motivationCount },
    { label: "Audience Signals", value: asset.audienceSignalCount },
    { label: "Messaging Angles", value: asset.messagingCount },
  ];

  return (
    <Link href={asset.href} className="card p-5 flex flex-col gap-4 hover:border-border-strong transition-colors group block">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-wide text-text-muted">Customer Intelligence</p>
          <h3 className="text-base font-semibold text-text-primary">{asset.businessName}</h3>
          <p className="text-xs text-text-muted mt-0.5">Version {asset.version}</p>
        </div>
        <ConfidenceBadge score={asset.confidence} size="sm" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 border-t border-border pt-4">
        {stats.map(s => (
          <div key={s.label}>
            <p className="text-lg font-semibold text-text-primary font-mono">{s.value}</p>
            <p className="text-[10px] text-text-muted uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Sparkles size={12} />
          Generated {relativeDay(asset.createdAt)}
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-1.5 transition-all">
          Open Report <ArrowRight size={12} />
        </span>
      </div>
    </Link>
  );
}

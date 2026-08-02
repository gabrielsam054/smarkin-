import { ChevronDown, Target, Users, Zap, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CampaignStructure } from "@/lib/strategy";

interface CampaignStructureDisplayProps {
  structure: CampaignStructure;
}

const qualityColor = (q: number) =>
  q >= 90 ? "text-primary border-primary/30 bg-primary/10" :
  q >= 75 ? "text-amber border-amber/30 bg-amber/10" :
  "text-text-secondary border-border bg-surface-2";

export function CampaignStructureDisplay({ structure }: CampaignStructureDisplayProps) {
  return (
    <div className="space-y-3 pt-4">
      {/* Campaign node */}
      <div className="bg-surface border border-primary/30 rounded-sm px-5 py-4 text-center">
        <p className="font-mono text-[9px] uppercase tracking-[2px] text-primary mb-1">Campaign</p>
        <p className="font-heading font-bold text-text-primary text-sm">{structure.campaignName}</p>
        <p className="font-mono text-[10px] text-text-muted mt-1">Objective: {structure.objective}</p>
      </div>

      {/* Arrow */}
      <div className="flex justify-center">
        <ChevronDown size={20} className="text-primary" />
      </div>

      {/* Ad sets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {structure.adSets.map((adset, i) => (
          <div key={adset.id} className="bg-[#0B1120] border border-border rounded-sm p-4 flex flex-col gap-3">
            {/* Ad set header */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-[2px] text-secondary">Ad Set {i + 1}</span>
              <span className={cn("font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border", qualityColor(adset.audienceQuality))}>
                {adset.audienceQuality}%
              </span>
            </div>

            <p className="font-heading font-semibold text-text-primary text-xs leading-snug">{adset.name}</p>

            {/* Fields */}
            <div className="space-y-1.5 text-[11px]">
              {[
                { Icon: Target, label: "Primary", value: adset.primaryInterest, color: "text-primary" },
                { Icon: Target, label: "Secondary", value: adset.secondaryInterest, color: "text-secondary" },
                { Icon: Zap,    label: "Behavior", value: adset.behavior, color: "text-amber" },
                { Icon: Users,  label: "Persona",  value: adset.persona, color: "text-violet-400" },
                { Icon: MapPin, label: "Location", value: adset.location, color: "text-text-secondary" },
              ].map(({ Icon, label, value, color }) => value && value !== "—" ? (
                <div key={label} className="flex items-start gap-2">
                  <Icon size={10} className={cn("mt-0.5 flex-none", color)} />
                  <div className="min-w-0">
                    <span className="text-text-muted">{label}: </span>
                    <span className="text-text-secondary truncate">{value}</span>
                  </div>
                </div>
              ) : null)}
            </div>

            {/* Stats */}
            <div className="pt-2 border-t border-border grid grid-cols-2 gap-2">
              <div>
                <p className="font-mono text-[8px] uppercase tracking-wider text-text-muted">Quality</p>
                <div className="h-1 bg-surface-2 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${adset.audienceQuality}%` }} />
                </div>
              </div>
              <div>
                <p className="font-mono text-[8px] uppercase tracking-wider text-text-muted">Confidence</p>
                <div className="h-1 bg-surface-2 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-secondary rounded-full" style={{ width: `${adset.confidence}%` }} />
                </div>
              </div>
            </div>

            <div className="text-center">
              <span className="font-mono text-[9px] text-text-muted">{adset.audienceStrategy}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

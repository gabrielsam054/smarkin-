import { CheckCircle, Link2, Star, Zap, Users, Tag, BarChart2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Evidence, EvidenceType } from "@/lib/intelligence";

const CONFIG: Record<EvidenceType, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  "Industry Match":       { icon: BarChart2,   color: "text-blue-400",   bg: "bg-blue-400/10",   border: "border-blue-400/30" },
  "Sector Match":         { icon: BarChart2,   color: "text-blue-300",   bg: "bg-blue-300/10",   border: "border-blue-300/25" },
  "Category Match":       { icon: Tag,         color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400/30" },
  "Product Family Match": { icon: Star,        color: "text-primary",    bg: "bg-primary/10",    border: "border-primary/30" },
  "Persona Match":        { icon: Users,       color: "text-secondary",  bg: "bg-secondary/10",  border: "border-secondary/30" },
  "Behavior Match":       { icon: Zap,         color: "text-amber",      bg: "bg-amber/10",      border: "border-amber/30" },
  "Keyword Match":        { icon: Tag,         color: "text-teal-400",   bg: "bg-teal-400/10",   border: "border-teal-400/25" },
  "Relationship Database":{ icon: Link2,       color: "text-primary",    bg: "bg-primary/15",    border: "border-primary/40" },
  "Recommendation Rule":  { icon: ShieldCheck, color: "text-amber",      bg: "bg-amber/10",      border: "border-amber/30" },
  "Verified Meta Data":   { icon: CheckCircle, color: "text-primary",    bg: "bg-primary/10",    border: "border-primary/30" },
  "Audience Pairing":     { icon: Link2,       color: "text-secondary",  bg: "bg-secondary/10",  border: "border-secondary/25" },
};

const STRENGTH_RING: Record<Evidence["strength"], string> = {
  strong:   "ring-1 ring-primary/20",
  moderate: "ring-1 ring-border-strong",
  weak:     "",
};

interface EvidenceBadgeProps {
  evidence: Evidence;
  size?: "sm" | "md";
}

export function EvidenceBadge({ evidence, size = "sm" }: EvidenceBadgeProps) {
  const cfg = CONFIG[evidence.type] ?? CONFIG["Verified Meta Data"];
  const Icon = cfg.icon;

  return (
    <div
      title={evidence.detail}
      className={cn(
        "inline-flex items-center gap-1.5 font-mono font-bold uppercase border rounded-full transition-all cursor-default",
        cfg.bg, cfg.border, cfg.color,
        STRENGTH_RING[evidence.strength],
        size === "sm"
          ? "text-[8px] tracking-[1.5px] px-2 py-0.5"
          : "text-[10px] tracking-[1.5px] px-3 py-1"
      )}
    >
      <Icon size={size === "sm" ? 8 : 10} className="flex-none" />
      {evidence.label}
    </div>
  );
}

interface EvidenceListProps {
  evidence: Evidence[];
  size?: "sm" | "md";
  max?: number;
}

export function EvidenceList({ evidence, size = "sm", max }: EvidenceListProps) {
  const visible = max ? evidence.slice(0, max) : evidence;
  const hidden  = max ? evidence.length - max : 0;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((e, i) => <EvidenceBadge key={i} evidence={e} size={size} />)}
      {hidden > 0 && (
        <span className="font-mono text-[8px] text-text-muted px-2 py-0.5 border border-border rounded-full">
          +{hidden} more
        </span>
      )}
    </div>
  );
}

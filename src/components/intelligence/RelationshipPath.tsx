import { ChevronRight, Box, Layers, LayoutGrid, Tag, Globe, Users, Star, Zap, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RelationshipNode, RelationshipPath } from "@/lib/intelligence";

const NODE_CONFIG: Record<RelationshipNode["type"], { icon: React.ElementType; color: string; bg: string }> = {
  product:      { icon: Box,        color: "text-primary",   bg: "bg-primary/15" },
  family:       { icon: Star,       color: "text-primary",   bg: "bg-primary/10" },
  subcategory:  { icon: Tag,        color: "text-violet-400",bg: "bg-violet-400/10" },
  category:     { icon: LayoutGrid, color: "text-secondary", bg: "bg-secondary/10" },
  sector:       { icon: Layers,     color: "text-blue-400",  bg: "bg-blue-400/10" },
  industry:     { icon: Globe,      color: "text-teal-400",  bg: "bg-teal-400/10" },
  persona:      { icon: Users,      color: "text-secondary", bg: "bg-secondary/10" },
  interest:     { icon: Star,       color: "text-primary",   bg: "bg-primary/10" },
  behavior:     { icon: Zap,        color: "text-amber",     bg: "bg-amber/10" },
  demographic:  { icon: MapPin,     color: "text-rose-400",  bg: "bg-rose-400/10" },
};

interface RelationshipPathDisplayProps {
  path: RelationshipPath;
  compact?: boolean;
}

export function RelationshipPathDisplay({ path, compact }: RelationshipPathDisplayProps) {
  const nodes = path.nodes.filter((n) => n.matched);
  if (!nodes.length) return null;

  if (compact) {
    return (
      <div className="flex items-center flex-wrap gap-1 font-mono text-[9px]">
        {nodes.map((node, i) => {
          const cfg = NODE_CONFIG[node.type] ?? NODE_CONFIG.product;
          return (
            <span key={i} className="flex items-center gap-1">
              <span className={cn("px-1.5 py-0.5 rounded text-[8px]", cfg.bg, cfg.color)}>
                {node.label}
              </span>
              {i < nodes.length - 1 && (
                <ChevronRight size={8} className="text-text-muted flex-none" />
              )}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted">
        Relationship Path
      </p>
      <div className="flex items-start flex-wrap gap-2">
        {nodes.map((node, i) => {
          const cfg = NODE_CONFIG[node.type] ?? NODE_CONFIG.product;
          const Icon = cfg.icon;
          return (
            <span key={i} className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border",
                cfg.bg,
                "border-border"
              )}>
                <Icon size={10} className={cn(cfg.color, "flex-none")} />
                <span className={cn("font-mono text-[9px] uppercase tracking-wider font-bold", cfg.color)}>
                  {node.type}
                </span>
                <span className="text-[11px] text-text-primary font-body font-medium">
                  {node.label}
                </span>
              </div>
              {i < nodes.length - 1 && (
                <ChevronRight size={12} className="text-text-muted flex-none" />
              )}
            </span>
          );
        })}
      </div>
      <p className="text-xs text-text-muted leading-relaxed">{path.description}</p>
    </div>
  );
}

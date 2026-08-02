import { CheckCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  RecommendedInterest,
  RecommendedBehavior,
  RecommendedDemographic,
  MatchedPersona,
  MatchedProblem,
} from "@/lib/engine";

// ── Source Badge ──────────────────────────────────────────────────────────────

interface SourceBadgeProps {
  label: string;
  verified?: boolean;
}

export function SourceBadge({ label, verified = true }: SourceBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[9px] tracking-[1.5px] uppercase text-text-muted border border-border rounded-full px-2 py-0.5">
      <CheckCircle size={8} className={verified ? "text-primary" : "text-text-muted"} />
      {label}
    </span>
  );
}

// ── Confidence Bar ────────────────────────────────────────────────────────────

interface ConfidenceBarProps {
  score: number;
  color?: "green" | "blue" | "amber";
  size?: "sm" | "md";
}

export function ConfidenceBar({ score, color = "green", size = "sm" }: ConfidenceBarProps) {
  const colorMap = {
    green: "bg-primary",
    blue:  "bg-secondary",
    amber: "bg-amber",
  };
  return (
    <div className={cn("w-full rounded-full bg-surface-2 overflow-hidden", size === "sm" ? "h-1" : "h-1.5")}>
      <div
        className={cn("h-full rounded-full transition-all duration-700", colorMap[color])}
        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
      />
    </div>
  );
}

// ── Tier Chip ─────────────────────────────────────────────────────────────────

interface TierChipProps {
  tier: "primary" | "secondary" | "expansion";
}

export function TierChip({ tier }: TierChipProps) {
  const map = {
    primary:   "bg-primary/10 text-primary border-primary/30",
    secondary: "bg-secondary/10 text-secondary border-secondary/30",
    expansion: "bg-amber/10 text-amber border-amber/30",
  };
  return (
    <span className={cn("font-mono text-[8px] uppercase tracking-[1.5px] font-bold px-2 py-0.5 rounded-full border", map[tier])}>
      {tier}
    </span>
  );
}

// ── Interest Card ─────────────────────────────────────────────────────────────

interface InterestCardProps {
  interest: RecommendedInterest;
}

export function InterestCard({ interest }: InterestCardProps) {
  return (
    <div className="bg-[#0B1120] border border-border rounded-sm p-4 flex flex-col gap-3 hover:border-border-strong transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-heading font-semibold text-text-primary text-sm leading-snug">
            {interest.name}
          </p>
          <p className="text-[10px] text-text-muted font-mono mt-0.5">
            {interest.mainCategory} › {interest.subCategory}
          </p>
        </div>
        <TierChip tier={interest.tier} />
      </div>

      <ConfidenceBar score={interest.score} />

      <p className="text-xs text-text-secondary leading-relaxed">{interest.reason}</p>

      <div className="flex items-center justify-between pt-1 border-t border-border">
        <SourceBadge label={interest.source} />
        <span className={cn(
          "font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
          interest.buyingIntent === "High"
            ? "text-primary bg-primary/10"
            : "text-text-muted bg-surface-2"
        )}>
          {interest.buyingIntent} intent
        </span>
      </div>
    </div>
  );
}

// ── Behavior Card ─────────────────────────────────────────────────────────────

interface BehaviorCardProps {
  behavior: RecommendedBehavior;
}

export function BehaviorCard({ behavior }: BehaviorCardProps) {
  return (
    <div className="bg-[#0B1120] border border-border rounded-sm p-4 flex flex-col gap-3 hover:border-border-strong transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-heading font-semibold text-text-primary text-sm leading-snug">
            {behavior.metaAudience}
          </p>
          <p className="text-[10px] text-text-muted font-mono mt-0.5">
            {behavior.parent} › {behavior.child}
          </p>
        </div>
        <span className="font-mono text-xs text-secondary font-bold flex-none">
          {behavior.score}%
        </span>
      </div>

      <ConfidenceBar score={behavior.score} color="blue" />

      <p className="text-xs text-text-secondary leading-relaxed">{behavior.reason}</p>

      <div className="flex items-center justify-between pt-1 border-t border-border">
        <SourceBadge label={behavior.source} />
        <span className="font-mono text-[9px] text-primary uppercase tracking-wider">
          {behavior.verification}
        </span>
      </div>
    </div>
  );
}

// ── Demographic Card ──────────────────────────────────────────────────────────

function formatAudienceSize(min: number, max: number): string {
  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n > 0 ? String(n) : "—";
  };
  if (!min && !max) return "—";
  return `${fmt(min)} – ${fmt(max)}`;
}

interface DemographicCardProps {
  demographic: RecommendedDemographic;
}

export function DemographicCard({ demographic }: DemographicCardProps) {
  return (
    <div className="bg-[#0B1120] border border-border rounded-sm p-4 flex flex-col gap-3 hover:border-border-strong transition-colors">
      <div>
        <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted mb-1">
          {demographic.category} › {demographic.subcategory}
        </p>
        <p className="font-heading font-semibold text-text-primary text-sm leading-snug">
          {demographic.name}
        </p>
      </div>

      <p className="text-[10px] text-text-muted font-mono leading-relaxed">
        {demographic.metaPath}
      </p>

      <div className="flex items-center justify-between pt-1 border-t border-border">
        <SourceBadge label={demographic.source} />
        <div className="text-right">
          <p className="font-mono text-[9px] text-text-muted uppercase tracking-wider">Audience</p>
          <p className="font-mono text-xs text-text-secondary">
            {formatAudienceSize(demographic.audienceSizeMin, demographic.audienceSizeMax)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Persona Card ──────────────────────────────────────────────────────────────

interface PersonaCardProps {
  persona: MatchedPersona;
  rank: number;
}

export function PersonaCard({ persona, rank }: PersonaCardProps) {
  const initials = persona.name?.split(" ").map((w) => w[0]).join("").slice(0, 2);

  return (
    <div className="bg-[#0B1120] border border-border rounded-sm p-5 flex flex-col gap-4 hover:border-border-strong transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-heading font-bold text-white text-sm flex-none">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-heading font-semibold text-text-primary text-sm truncate">
              {persona.name}
            </p>
            <span className="font-mono text-[10px] text-primary font-bold flex-none">
              #{rank}
            </span>
          </div>
          <p className="text-[10px] text-text-muted font-mono mt-0.5">{persona.productCategories}</p>
        </div>
        <div className="text-right flex-none">
          <p className="font-mono text-xs text-primary font-bold">{persona.relevanceScore}%</p>
          <p className="font-mono text-[9px] text-text-muted">relevance</p>
        </div>
      </div>

      <ConfidenceBar score={persona.relevanceScore} />

      <div className="space-y-2.5 text-xs border-t border-border pt-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-text-muted mb-0.5">Primary Goal</p>
          <p className="text-text-secondary">{persona.goal}</p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-text-muted mb-0.5">Pain Point</p>
          <p className="text-text-secondary">{persona.painPoint}</p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-text-muted mb-0.5">Buying Motivation</p>
          <p className="text-text-secondary">{persona.buyingMotivation}</p>
        </div>
      </div>

      <div className="pt-1">
        <SourceBadge label={persona.source} />
      </div>
    </div>
  );
}

// ── Problem Card ──────────────────────────────────────────────────────────────

interface ProblemCardProps {
  problem: MatchedProblem;
}

export function ProblemCard({ problem }: ProblemCardProps) {
  return (
    <div className="bg-[#0B1120] border border-destructive/15 rounded-sm p-4 flex flex-col gap-2 hover:border-destructive/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="font-heading font-semibold text-text-primary text-sm">{problem.problem}</p>
        <span className="text-destructive flex-none">→</span>
      </div>
      <p className="text-xs text-text-muted font-mono">{problem.commonProducts}</p>
      <div className="flex items-center gap-2 pt-1 border-t border-border">
        <TrendingUp size={10} className="text-primary flex-none" />
        <p className="text-xs text-text-secondary">Goal: {problem.customerGoal}</p>
      </div>
      <SourceBadge label={problem.source} />
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: "green" | "blue" | "amber" | "default";
}

export function StatCard({ label, value, sub, color = "default" }: StatCardProps) {
  const colorMap = {
    green:   "text-primary",
    blue:    "text-secondary",
    amber:   "text-amber",
    default: "text-text-primary",
  };
  return (
    <div className="bg-surface border border-border rounded-sm px-4 py-3">
      <p className="font-mono text-[9px] tracking-[2px] uppercase text-text-muted mb-1">{label}</p>
      <p className={cn("text-sm font-heading font-bold", colorMap[color])}>{value}</p>
      {sub && <p className="text-[10px] text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Score Bar Row ─────────────────────────────────────────────────────────────

interface ScoreBarRowProps {
  label: string;
  value: number;
  color?: "green" | "blue" | "amber";
}

export function ScoreBarRow({ label, value, color = "green" }: ScoreBarRowProps) {
  return (
    <div className="grid grid-cols-[140px_1fr_40px] items-center gap-3">
      <p className="text-xs text-text-secondary font-mono truncate">{label}</p>
      <ConfidenceBar score={value} color={color} size="md" />
      <p className={cn("text-xs font-mono font-bold text-right", {
        "text-primary": color === "green",
        "text-secondary": color === "blue",
        "text-amber": color === "amber",
      })}>
        {value}%
      </p>
    </div>
  );
}

// ── Source Row ────────────────────────────────────────────────────────────────

interface SourceRowProps {
  name: string;
  source: string;
  tier?: string;
}

export function SourceRow({ name, source, tier }: SourceRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-none" />
        <p className="text-sm text-text-primary font-medium">{name}</p>
        {tier && <TierChip tier={tier as "primary" | "secondary" | "expansion"} />}
      </div>
      <SourceBadge label={source} />
    </div>
  );
}

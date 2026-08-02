import Link from "next/link";
import { Lock, ArrowRight, Sparkles } from "lucide-react";
import type { GatedFeature } from "@/lib/billing";

const FEATURE_LABELS: Record<GatedFeature, { name: string; desc: string }> = {
  audience_intelligence: { name: "Audience Intelligence", desc: "Full interest, behavior, and persona matching" },
  campaign_strategy:     { name: "Campaign Strategy Engine", desc: "Complete Meta campaign blueprint" },
  creative_studio:       { name: "AI Creative Studio", desc: "Hooks, copy, video and image concepts" },
  saved_reports:         { name: "Saved Reports", desc: "Bookmark and revisit any analysis" },
  advanced_exports:      { name: "Advanced Exports", desc: "PDF, CSV and JSON report downloads" },
  team_workspaces:       { name: "Team Workspaces", desc: "Collaborate with your team" },
};

interface UpgradePromptProps {
  feature: GatedFeature;
  compact?: boolean;
}

export function UpgradePrompt({ feature, compact }: UpgradePromptProps) {
  const { name, desc } = FEATURE_LABELS[feature];

  if (compact) {
    return (
      <div className="flex items-center gap-4 px-5 py-3.5 bg-surface border border-amber/20 rounded-xl">
        <div className="w-8 h-8 rounded-lg bg-amber/10 border border-amber/20 flex items-center justify-center flex-none">
          <Lock size={13} className="text-amber" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">{name}</p>
          <p className="text-xs text-text-muted">Requires an active plan</p>
        </div>
        <Link
          href="/billing#plans"
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors flex-none"
        >
          Upgrade <ArrowRight size={11} />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center">
          <Lock size={22} className="text-text-muted" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <Sparkles size={11} className="text-black" />
        </div>
      </div>

      <h3 className="text-xl font-heading font-bold text-text-primary mb-2">{name}</h3>
      <p className="text-text-secondary text-sm leading-relaxed max-w-xs mb-2">{desc}</p>
      <p className="text-text-muted text-xs mb-8">Unlock with any Smarkin AI plan</p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/billing#plans"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-black text-sm font-heading font-bold hover:bg-primary/90 transition-colors shadow-[0_0_20px_rgba(34,197,94,0.3)]"
        >
          <Sparkles size={13} />
          View plans
          <ArrowRight size={13} />
        </Link>
        <Link
          href="/billing"
          className="text-sm text-text-muted hover:text-text-secondary transition-colors"
        >
          Learn more
        </Link>
      </div>
    </div>
  );
}

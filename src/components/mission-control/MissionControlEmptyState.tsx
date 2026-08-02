import Link from "next/link";
import { Sparkles } from "lucide-react";

/**
 * Per UX Spec §2: "Empty: new workspace, zero reports — a single clear
 * CTA, not a dashboard of empty widgets." Explicitly NOT rendering
 * RecentActivity (all-zero tiles) or an empty hero — a page full of
 * zeros looks broken; one clear next action doesn't.
 */
export function MissionControlEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6">
      <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
        <Sparkles size={18} className="text-primary" />
      </div>
      <p className="font-semibold text-text-primary text-base mb-1.5">Welcome to Smarkin</p>
      <p className="text-text-muted text-sm mb-6 max-w-sm">
        Run your first Customer Research to see evidence-backed insights here.
      </p>
      <Link href="/research/new"
        className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg px-4 py-2.5 hover:bg-primary-dim transition-colors">
        Start Research
      </Link>
    </div>
  );
}

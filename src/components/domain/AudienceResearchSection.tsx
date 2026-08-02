import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { AudienceCard, AudienceRecommendation } from "./AudienceCard";

const CAPABILITIES = ["Interests", "Behaviors", "Demographics", "Platform suitability"];

/**
 * Built entirely from AudienceCard, as required. When no audience asset
 * exists yet, this shows a real, accurate call-to-action — Audience
 * Research is a genuine, working capability at this point in the
 * project, it simply hasn't been run for this specific business. The
 * previous copy here ("no engine registered yet") predated that work and
 * was stale, not just unstyled — fixed as part of this redesign, not
 * left as an accurate-looking but wrong placeholder.
 */
export function AudienceResearchSection({ audiences, runHref }: { audiences: AudienceRecommendation[]; runHref: string }) {
  if (audiences.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Audience Research</p>
            <h3 className="text-lg font-semibold text-text-primary mb-3">Not yet run for this business</h3>
            <p className="text-sm text-text-secondary max-w-md mb-4">
              This will identify real interests, behaviors, demographics, and platform suitability from the
              same evidence-based approach used throughout this report.
            </p>
            <ul className="flex flex-col gap-1.5 mb-5">
              {CAPABILITIES.map(item => (
                <li key={item} className="flex items-center gap-2 text-sm text-text-secondary">
                  <Check size={14} className="text-primary flex-none" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href={runHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              Run Audience Research <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {audiences.map((audience, i) => (
        <AudienceCard key={i} audience={audience} />
      ))}
    </div>
  );
}

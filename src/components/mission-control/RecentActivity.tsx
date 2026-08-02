import { Search, Target, Compass, FileText } from "lucide-react";
import { MetricTile } from "@/components/domain/MetricTile";

/**
 * Per UX Spec §2: explicitly NOT the four-way Marketing/Campaign/
 * Content/Business health strip from the original vision — that needs
 * Performance Intelligence, which is schema-only. This is real counts
 * from real tables, honestly labeled "Recent Activity" rather than an
 * invented composite health score.
 */
export function RecentActivity({ counts }: {
  counts: { researchRuns: number; audienceRuns: number; decisionsRun: number; reportsTotal: number };
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <MetricTile icon={Search} label="Customer Research" value={counts.researchRuns} />
      <MetricTile icon={Target} label="Audience Research" value={counts.audienceRuns} />
      <MetricTile icon={Compass} label="Decisions" value={counts.decisionsRun} />
      <MetricTile icon={FileText} label="Total Reports" value={counts.reportsTotal} />
    </div>
  );
}

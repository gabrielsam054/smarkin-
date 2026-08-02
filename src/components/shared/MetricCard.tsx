import { LucideIcon } from "lucide-react";

/**
 * For any single real number — never a fabricated metric. The `source`
 * prop is intentionally required, not optional: a metric card without a
 * stated source is exactly the "placeholder business metrics pretending
 * to be real" pattern this sprint explicitly rules out.
 */
export function MetricCard({
  label, value, source, icon: Icon,
}: {
  label: string;
  value: string | number;
  source: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={13} className="text-text-muted" aria-hidden="true" />}
        <p className="text-xs text-text-muted">{label}</p>
      </div>
      <p className="text-2xl font-semibold text-text-primary font-mono">{value}</p>
      <p className="text-[10px] font-mono text-text-muted">{source}</p>
    </div>
  );
}

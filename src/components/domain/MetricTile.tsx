import { LucideIcon } from "lucide-react";

export function MetricTile({
  icon: Icon, label, value, tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone?: "default" | "warning";
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 transition-all duration-200 hover:border-border-strong hover:shadow-card-hover">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tone === "warning" ? "bg-amber/10 text-amber" : "bg-primary/10 text-primary"}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-2xl font-bold text-text-primary tracking-tight">{value}</p>
        <p className="text-xs text-text-muted mt-0.5">{label}</p>
      </div>
    </div>
  );
}

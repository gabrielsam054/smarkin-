import { LucideIcon } from "lucide-react";

/**
 * The single, shared honest-empty-state component. Every "capability
 * doesn't exist yet" screen (SEO, Content, Analytics-as-KPIs, Competitor
 * Intelligence) uses THIS, not a bespoke fake-data mockup. One component
 * makes the "we tell you honestly, we don't fabricate" policy structurally
 * consistent instead of relying on every page remembering to do it right.
 */
export function EmptyState({
  icon: Icon, title, description, action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-11 h-11 rounded-full bg-surface-2 border border-border flex items-center justify-center mb-4">
        <Icon size={18} className="text-text-muted" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

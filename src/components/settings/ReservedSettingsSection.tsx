import { Lock } from "lucide-react";

/**
 * Same honest pattern as the Intelligence section's RESERVED pages: a
 * real navigation entry with a stated activation condition, never a
 * fake form or a vague "coming soon." Settings areas gated on unbuilt
 * schema (workspaces, roles, api_keys, notifications tables — v16,
 * migrations 023/033 unrun per the preflight check) or on the known
 * PermissionProvider no-op (RBAC) use this rather than a form that
 * would submit to nothing.
 */
export function ReservedSettingsSection({
  title, description, activationCondition,
}: {
  title: string;
  description: string;
  activationCondition: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2 mb-1.5">
        <Lock size={13} className="text-text-muted flex-none" />
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      <p className="text-xs text-text-secondary mb-2">{description}</p>
      <p className="text-[11px] text-text-muted">{activationCondition}</p>
    </div>
  );
}

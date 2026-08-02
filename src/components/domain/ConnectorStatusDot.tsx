import { ConnectorAccountStatus } from "@/lib/connectors";

const STATUS_META: Record<ConnectorAccountStatus, { color: string; label: string }> = {
  active: { color: "bg-primary", label: "Active" },
  paused: { color: "bg-amber", label: "Paused" },
  revoked: { color: "bg-destructive", label: "Revoked — needs reconnect" },
  error: { color: "bg-destructive", label: "Error" },
};

/**
 * Direct mirror of platform_accounts.status — no UI-invented states.
 * Per the UX Spec QA checklist ("color is never the sole signal"): the
 * label is always rendered as visible text, not just conveyed via an
 * aria-label on an otherwise color-only dot.
 */
export function ConnectorStatusDot({ status }: { status: ConnectorAccountStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
      <span className={`w-1.5 h-1.5 rounded-full flex-none ${meta.color}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

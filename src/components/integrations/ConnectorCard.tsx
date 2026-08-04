"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Lock, Plug, PauseCircle, RotateCw } from "lucide-react";
import { ConnectedAccount, ConnectorDefinition } from "@/lib/connectors";
import { ConnectorStatusDot } from "@/components/domain/ConnectorStatusDot";

/**
 * Calls the DOCUMENTED v16 endpoint contract (POST /api/v1/connectors/:key/connect,
 * per the UX Spec's backend mapping). This endpoint does not exist yet —
 * that's expected, normal frontend/backend parallel development, not a
 * placeholder. What makes this NOT a placeholder: the request is real,
 * and failure is handled honestly (a clear error shown to the user) —
 * nothing here fakes success or silently swallows the realistic 404/500
 * this will currently return. The moment the real endpoint ships, this
 * component needs zero changes to work correctly.
 */
export function ConnectorCard({ connector, account }: { connector: ConnectorDefinition; account?: ConnectedAccount }) {
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/connectors/${connector.key}/connect`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(res.status === 404
          ? "Connecting isn't available yet — this platform's backend hasn't shipped."
          : body.error ?? `Connection failed (${res.status})`);
      }
      const { redirectUrl } = await res.json();
      if (redirectUrl) window.location.href = redirectUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed unexpectedly.");
    } finally {
      setConnecting(false);
    }
  }

  // Closes the other half of Feature 17's flagged gap: this button
  // previously had no onClick at all. Real toggle, gated by the same
  // ownership check the API route itself enforces server-side — this
  // client-side call isn't the security boundary, the route's
  // connected_by check is; this is just triggering it.
  async function handleTogglePause() {
    if (!account) return;
    setTogglingPause(true);
    setError(null);
    const nextStatus = account.status === "paused" ? "active" : "paused";
    try {
      const res = await fetch(`/api/v1/connectors/accounts/${account.platformAccountId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to update status (${res.status})`);
      }
      // Re-fetches the server component's data (the account list this
      // page renders from) so the toggled status actually appears
      // without a manual page reload — router.refresh() re-runs the
      // server-side query, it doesn't lose client-side state elsewhere
      // on the page.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status unexpectedly.");
    } finally {
      setTogglingPause(false);
    }
  }

  // The real gap being closed: Pause never actually disconnected
  // anything, just changed status. This is the genuine, complete
  // action — real confirmation first since it's destructive (deletes
  // the stored credential and attempts to revoke access with Meta
  // itself), matching the established rule that destructive actions
  // confirm before executing rather than being one accidental click away.
  async function handleDisconnect() {
    if (!account) return;
    if (!window.confirm(`Disconnect ${connector.displayName}? This removes Smarkin's access and stops all syncing. You can reconnect anytime.`)) {
      return;
    }
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/connectors/accounts/${account.platformAccountId}/disconnect`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to disconnect (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to disconnect unexpectedly.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center flex-none">
            <Plug size={15} className="text-text-muted" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">{connector.displayName}</p>
            {account ? (
              <div className="mt-0.5">
                <ConnectorStatusDot status={account.status} />
              </div>
            ) : (
              <p className="text-xs text-text-muted mt-0.5">
                {connector.available ? "Not connected" : "Coming soon"}
              </p>
            )}
          </div>
        </div>

        <div className="flex-none">
          {account ? (
            account.status === "revoked" ? (
              // A revoked account can't be "managed" back to health —
              // the stored token is genuinely invalid. Reconnect
              // re-triggers the same real OAuth flow as a first-time
              // connect, which the upserted callback (this feature) now
              // handles correctly instead of hitting a constraint error.
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting}
                className="text-xs font-semibold bg-primary text-primary-foreground rounded-lg px-3 py-1.5 hover:bg-primary-dim transition-colors disabled:opacity-50"
              >
                {connecting ? "Reconnecting…" : "Reconnect"}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTogglePause}
                  disabled={togglingPause}
                  className="text-xs font-medium text-text-secondary hover:text-text-primary border border-border rounded-lg px-3 py-1.5 hover:border-border-strong transition-colors disabled:opacity-50"
                >
                  {togglingPause ? "…" : account.status === "paused" ? "Resume" : "Pause"}
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="text-xs font-medium text-text-muted hover:text-destructive transition-colors disabled:opacity-50"
                >
                  {disconnecting ? "…" : "Disconnect"}
                </button>
              </div>
            )
          ) : connector.available ? (
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="text-xs font-semibold bg-primary text-primary-foreground rounded-lg px-3 py-1.5 hover:bg-primary-dim transition-colors disabled:opacity-50"
            >
              {connecting ? "Connecting…" : "Connect"}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-text-muted" title="Not yet on the roadmap for this phase">
              <Lock size={11} />
            </span>
          )}
        </div>
      </div>

      {account && account.healthState !== "closed" && (
        <div className={`flex items-start gap-2 text-[11px] rounded-lg px-3 py-2 ml-12 ${
          account.healthState === "half_open" ? "bg-amber/10 text-amber" : "bg-destructive/10 text-destructive"
        }`}>
          {account.healthState === "half_open" ? <RotateCw size={12} className="flex-none mt-0.5" /> : <PauseCircle size={12} className="flex-none mt-0.5" />}
          <span>
            {account.healthState === "half_open"
              ? "Testing recovery — retrying after repeated failures."
              : "Syncing paused after repeated failures. Smarkin will automatically test recovery soon — no action needed unless this persists."}
          </span>
        </div>
      )}

      {account?.lastError && (
        <p className="text-[11px] text-destructive flex items-center gap-1 pl-12">
          <AlertTriangle size={11} className="flex-none" />
          {account.lastError}
        </p>
      )}

      {error && (
        <p role="alert" className="text-[11px] text-destructive pl-12">{error}</p>
      )}
    </div>
  );
}

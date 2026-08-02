import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import { AppShell } from "@/components/layout/AppShell";
import { ConnectorCard } from "@/components/integrations/ConnectorCard";
import { CONNECTORS, ConnectedAccount } from "@/lib/connectors";
import { resolveWorkspaceId } from "@/lib/workspace/resolveWorkspaceId";
import { getConnectErrorMessage } from "@/lib/connectors/connectErrorMessages";

/**
 * Real, buildable-now UI (per UX Spec §Phase 2 reasoning: connector
 * states are a direct mirror of frozen v16 schema, not speculation).
 * The query below is defensive for the case platform_accounts doesn't
 * exist at all — if it doesn't, Supabase's client returns an error
 * object rather than throwing, so this page renders its honest
 * "connect your first platform" state instead of crashing.
 */
export default async function IntegrationsPage({
  searchParams,
}: {
  // Closes a real, significant gap: every redirect from the connect/
  // callback routes has carried a connect_error or connected param
  // with genuinely specific information since Feature 10, and this
  // page never read searchParams at all — every message was silently
  // discarded. Fixed here rather than left as a known limitation.
  searchParams: Promise<{ connect_error?: string; connected?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // The fix for the exact bug the OAuth callback route just closed:
  // this was reading platform_accounts filtered by workspace_id =
  // user.id — the same broken placeholder. Even after a connection
  // writes successfully with a REAL workspace_id, this page would keep
  // showing "Not Connected" forever, since it was looking under the
  // wrong value. Resolved the same way the write side now is.
  const workspaceId = await resolveWorkspaceId(user.id, supabase);

  const [{ data: profile }, isAdmin, accountsResult] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    isCurrentUserAdmin(),
    workspaceId
      ? supabase
          .from("platform_accounts")
          .select("id, connector_key, external_account_id, display_name, status, connected_at, connector_health(state, last_error)")
          .eq("workspace_id", workspaceId)
      : Promise.resolve({ data: null, error: null }),
  ]);

  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  type AccountRow = {
    id: string; connector_key: string; external_account_id: string; display_name: string | null;
    status: ConnectedAccount["status"]; connected_at: string;
    connector_health: { state: ConnectedAccount["healthState"]; last_error: string | null } | null;
  };

  const accountsByConnector = new Map<string, ConnectedAccount>();
  if (!accountsResult.error) {
    for (const row of (accountsResult.data ?? []) as unknown as AccountRow[]) {
      accountsByConnector.set(row.connector_key, {
        platformAccountId: row.id,
        connectorKey: row.connector_key,
        externalAccountId: row.external_account_id,
        displayName: row.display_name,
        status: row.status,
        healthState: row.connector_health?.state ?? "closed",
        lastOkAt: null,
        lastError: row.connector_health?.last_error ?? null,
        connectedAt: row.connected_at,
      });
    }
  }

  const hasAnyConnection = accountsByConnector.size > 0;

  return (
    <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Integrations">
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Integrations</h1>
          <p className="text-sm text-text-secondary mt-1">
            {hasAnyConnection
              ? "Connected platforms and their sync status."
              : "Connect a platform to let Smarkin watch its performance continuously."}
          </p>
        </div>

        {/* The actual fix: real, visible feedback for every connect
            attempt's outcome — replacing "the user has to read the URL
            and paste it to us" with the page just telling them. */}
        {params.connect_error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive px-4 py-3 mb-4 text-sm">
            <AlertTriangle size={16} className="flex-none mt-0.5" />
            <span>{getConnectErrorMessage(params.connect_error)}</span>
          </div>
        )}
        {params.connected && (
          <div role="status" className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 text-primary px-4 py-3 mb-4 text-sm">
            <CheckCircle2 size={16} className="flex-none mt-0.5" />
            <span>Connected successfully. Your first sync will run automatically soon.</span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {CONNECTORS.map((connector) => (
            <ConnectorCard key={connector.key} connector={connector} account={accountsByConnector.get(connector.key)} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
